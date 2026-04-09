import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../config/env.js";
import { appendInboundChatMessage, appendOutboundChatMessage } from "../services/chat.service.js";
import { generateReply } from "../services/whatsappAi.service.js";
import {
  WhatsAppError,
  getWhatsAppAutomationStatus,
  sendWhatsAppMessage
} from "../services/whatsapp.service.js";
import { sanitizeMultiline } from "../utils/sanitize.js";
import { enqueueWhatsAppJob } from "../services/whatsappQueue.service.js";

interface RequestWithRawBody extends Request {
  rawBody?: string;
}

interface IncomingWhatsAppMessage {
  phone: string;
  message: string;
  timestamp: Date;
}

function resolveHubQueryParam(req: Request, key: string): string {
  const direct = req.query[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  // express-mongo-sanitize drops dot keys like "hub.mode";
  // parse from raw URL so Meta webhook verification still works.
  try {
    const url = new URL(req.originalUrl || req.url, "http://localhost");
    return (url.searchParams.get(key) || "").trim();
  } catch {
    return "";
  }
}

function verifyWebhookSignature(req: RequestWithRawBody) {
  if (!env.metaAppSecret) return true;

  const signature = req.get("x-hub-signature-256");
  if (!signature) return false;

  const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", env.metaAppSecret)
    .update(rawBody)
    .digest("hex")}`;

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function extractIncomingMessages(payload: any): IncomingWhatsAppMessage[] {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const messages: IncomingWhatsAppMessage[] = [];

  entries.forEach((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    changes.forEach((change: any) => {
      const value = change?.value;
      const incoming = Array.isArray(value?.messages) ? value.messages : [];

      incoming.forEach((message: any) => {
        const from = String(message?.from ?? "").trim();
        if (!from) return;

        const timestampRaw = Number(message?.timestamp ?? Date.now() / 1000);
        const timestamp = Number.isFinite(timestampRaw) ? new Date(timestampRaw * 1000) : new Date();

        let text = "";
        if (message?.type === "text") {
          text = String(message?.text?.body ?? "");
        } else if (message?.type === "button") {
          text = String(message?.button?.text ?? "");
        } else if (message?.type === "interactive") {
          text = String(
            message?.interactive?.button_reply?.title ??
              message?.interactive?.list_reply?.title ??
              message?.interactive?.list_reply?.description ??
              ""
          );
        }

        const cleanText = sanitizeMultiline(text, 1000);
        if (!cleanText) return;

        messages.push({
          phone: from.startsWith("+") ? from : `+${from}`,
          message: cleanText,
          timestamp
        });
      });
    });
  });

  return messages;
}

async function handleIncomingMessage(message: IncomingWhatsAppMessage) {
  const chat = await appendInboundChatMessage({
    phone: message.phone,
    message: message.message,
    timestamp: message.timestamp
  });

  const history = chat.messages.map((entry) => ({
    direction: entry.direction,
    text: entry.text
  }));
  const aiReply = await generateReply(message.message, history);

  await sendWhatsAppMessage({
    phone: chat.phone,
    message: aiReply
  });

  await appendOutboundChatMessage({
    phone: chat.phone,
    message: aiReply,
    source: "ai"
  });
}

export async function sendWhatsAppFromApi(req: Request, res: Response) {
  try {
    const phone = String(req.body.phone ?? "");
    const message = String(req.body.message ?? "");

    await sendWhatsAppMessage({ phone, message });
    await appendOutboundChatMessage({
      phone,
      message,
      source: "admin"
    });

    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof WhatsAppError) {
      return res.status(error.statusCode).json({
        ok: false,
        error: error.message,
        ...(typeof error.metaCode === "number" ? { metaCode: error.metaCode } : {})
      });
    }

    const message = error instanceof Error ? error.message : "Unexpected WhatsApp send error.";
    return res.status(500).json({
      ok: false,
      error: message
    });
  }
}

export async function getWhatsAppStatus(_req: Request, res: Response) {
  try {
    const status = await getWhatsAppAutomationStatus();
    return res.json(status);
  } catch (error) {
    console.error("WhatsApp status check failed:", error);
    return res.status(500).json({
      configured: false,
      canSend: false,
      message: "Failed to verify WhatsApp automation status."
    });
  }
}

export async function verifyWhatsAppWebhook(req: Request, res: Response) {
  const mode = resolveHubQueryParam(req, "hub.mode");
  const verifyToken = resolveHubQueryParam(req, "hub.verify_token");
  const challenge = resolveHubQueryParam(req, "hub.challenge");

  if (mode !== "subscribe" || !env.metaWebhookVerifyToken || verifyToken !== env.metaWebhookVerifyToken) {
    return res.status(403).send("Forbidden");
  }

  return res.status(200).send(challenge);
}

export async function receiveWhatsAppWebhook(req: RequestWithRawBody, res: Response) {
  if (!verifyWebhookSignature(req)) {
    return res.status(403).json({ message: "Invalid webhook signature." });
  }

  const incomingMessages = extractIncomingMessages(req.body);
  res.status(200).json({ received: true, count: incomingMessages.length });

  if (incomingMessages.length === 0) return;

  setImmediate(() => {
    incomingMessages.forEach((message) => {
      enqueueWhatsAppJob(async () => {
        await handleIncomingMessage(message);
      });
    });
  });
}

import { env } from "../config/env.js";
import { isValidPhoneE164, normalizePhoneE164 } from "./chat.service.js";

interface SendWhatsAppParams {
  phone: string;
  message: string;
}

interface MetaPhoneProfile {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface SenderValidationResult {
  expectedSenderE164: string;
  actualSenderE164: string | null;
  matchesExpected: boolean;
  warning: string | null;
}

export interface WhatsAppAutomationStatus {
  provider: "meta_cloud_api";
  configured: boolean;
  tokenConfigured: boolean;
  phoneNumberIdConfigured: boolean;
  webhookVerifyTokenConfigured: boolean;
  expectedSenderE164: string;
  actualSenderE164: string | null;
  senderMatchesExpected: boolean;
  canSend: boolean;
  warnings: string[];
}

const META_GRAPH_VERSION = "v20.0";
const DEFAULT_SENDER_NUMBER = "+919746927368";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedProfile: {
  checkedAt: number;
  profile: MetaPhoneProfile | null;
  warning: string | null;
} | null = null;

function normalizeOutgoingMessage(message: string) {
  return message.trim().slice(0, 1200);
}

function digitsOnly(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function resolveExpectedSenderE164() {
  const configured =
    env.metaWhatsAppSenderNumber ||
    process.env.ADMIN_NOTIFY_WHATSAPP ||
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ||
    DEFAULT_SENDER_NUMBER;
  return normalizePhoneE164(configured);
}

async function fetchMetaPhoneProfile(): Promise<{ profile: MetaPhoneProfile | null; warning: string | null }> {
  if (!env.metaWhatsAppToken || !env.metaWhatsAppPhoneNumberId) {
    return {
      profile: null,
      warning: "Meta WhatsApp token or phone number id is missing."
    };
  }

  const now = Date.now();
  if (cachedProfile && now - cachedProfile.checkedAt < PROFILE_CACHE_TTL_MS) {
    return {
      profile: cachedProfile.profile,
      warning: cachedProfile.warning
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${env.metaWhatsAppPhoneNumberId}?fields=id,display_phone_number,verified_name`,
      {
        headers: {
          Authorization: `Bearer ${env.metaWhatsAppToken}`
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      const warning = `Meta sender profile lookup failed: ${text}`;
      cachedProfile = { checkedAt: now, profile: null, warning };
      return { profile: null, warning };
    }

    const profile = (await response.json()) as MetaPhoneProfile;
    cachedProfile = { checkedAt: now, profile, warning: null };
    return { profile, warning: null };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Unknown sender profile lookup failure.";
    cachedProfile = { checkedAt: now, profile: null, warning };
    return { profile: null, warning };
  }
}

async function validateConfiguredSender(): Promise<SenderValidationResult> {
  const expectedSenderE164 = resolveExpectedSenderE164();
  const { profile, warning } = await fetchMetaPhoneProfile();

  const actualSenderE164 = profile?.display_phone_number ? normalizePhoneE164(profile.display_phone_number) : null;
  const expectedDigits = digitsOnly(expectedSenderE164);
  const actualDigits = actualSenderE164 ? digitsOnly(actualSenderE164) : "";
  const matchesExpected = Boolean(actualDigits) && Boolean(expectedDigits) && actualDigits === expectedDigits;

  return {
    expectedSenderE164,
    actualSenderE164,
    matchesExpected,
    warning
  };
}

async function sendViaMetaCloud(params: SendWhatsAppParams) {
  if (!env.metaWhatsAppToken || !env.metaWhatsAppPhoneNumberId) {
    throw new Error("Meta WhatsApp is not configured.");
  }

  const senderValidation = await validateConfiguredSender();
  if (senderValidation.actualSenderE164 && !senderValidation.matchesExpected) {
    throw new Error(
      `Meta sender mismatch. Expected ${senderValidation.expectedSenderE164}, actual ${senderValidation.actualSenderE164}.`
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${env.metaWhatsAppPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.metaWhatsAppToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhoneE164(params.phone).replace(/^\+/, ""),
        type: "text",
        text: { body: params.message }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Meta WhatsApp send failed: ${errorText}`);
  }
}

export async function getWhatsAppAutomationStatus(): Promise<WhatsAppAutomationStatus> {
  const senderValidation = await validateConfiguredSender();

  const warnings: string[] = [];
  if (senderValidation.warning) {
    warnings.push(senderValidation.warning);
  }
  if (senderValidation.actualSenderE164 && !senderValidation.matchesExpected) {
    warnings.push(
      `Sender mismatch detected. Expected ${senderValidation.expectedSenderE164}, actual ${senderValidation.actualSenderE164}.`
    );
  }

  const tokenConfigured = Boolean(env.metaWhatsAppToken);
  const phoneNumberIdConfigured = Boolean(env.metaWhatsAppPhoneNumberId);
  const webhookVerifyTokenConfigured = Boolean(env.metaWebhookVerifyToken);
  const configured = tokenConfigured && phoneNumberIdConfigured;
  const canSend = configured && (senderValidation.actualSenderE164 ? senderValidation.matchesExpected : true);

  return {
    provider: "meta_cloud_api",
    configured,
    tokenConfigured,
    phoneNumberIdConfigured,
    webhookVerifyTokenConfigured,
    expectedSenderE164: senderValidation.expectedSenderE164,
    actualSenderE164: senderValidation.actualSenderE164,
    senderMatchesExpected: senderValidation.actualSenderE164 ? senderValidation.matchesExpected : true,
    canSend,
    warnings
  };
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams) {
  const phone = normalizePhoneE164(params.phone);
  const message = normalizeOutgoingMessage(params.message);

  if (!message) {
    throw new Error("Message is required.");
  }

  if (!isValidPhoneE164(phone)) {
    throw new Error("Invalid phone number format.");
  }

  await sendViaMetaCloud({ phone, message });
}

function buildLeadWelcomeMessage(name: string) {
  const firstName = String(name || "")
    .trim()
    .split(/\s+/)[0];
  const helloName = firstName || "there";
  return `Hi ${helloName}, we received your request. We will contact you shortly.`;
}

export async function sendLeadCreatedWhatsApp(params: { name: string; phone: string }) {
  await sendWhatsAppMessage({
    phone: params.phone,
    message: buildLeadWelcomeMessage(params.name)
  });
}

export async function sendLeadFollowUpWhatsApp(params: { phone: string }) {
  await sendWhatsAppMessage({
    phone: params.phone,
    message: "Just checking if you're still interested."
  });
}

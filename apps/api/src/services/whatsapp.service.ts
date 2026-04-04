import { env } from "../config/env.js";
import { isValidPhoneE164, normalizePhoneE164 } from "./chat.service.js";

interface SendWhatsAppParams {
  phone: string;
  message: string;
}

function normalizeOutgoingMessage(message: string) {
  return message.trim().slice(0, 1200);
}

async function sendViaMetaCloud(params: SendWhatsAppParams) {
  if (!env.metaWhatsAppToken || !env.metaWhatsAppPhoneNumberId) {
    throw new Error("Meta WhatsApp is not configured.");
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${env.metaWhatsAppPhoneNumberId}/messages`,
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

export async function sendLeadCreatedWhatsApp(params: { name: string; phone: string }) {
  await sendWhatsAppMessage({
    phone: params.phone,
    message: `Hi ${params.name}, we received your request. We will contact you shortly.`
  });
}

export async function sendLeadFollowUpWhatsApp(params: { phone: string }) {
  await sendWhatsAppMessage({
    phone: params.phone,
    message: "Just checking if you're still interested."
  });
}

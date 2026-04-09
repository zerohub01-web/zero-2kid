import { env } from "../config/env.js";
import { isValidPhoneE164, normalizePhoneE164 } from "./chat.service.js";

interface SendWhatsAppParams {
  phone: string;
  message: string;
}

export class WhatsAppError extends Error {
  statusCode: number;
  metaCode?: number;

  constructor(message: string, statusCode = 500, metaCode?: number) {
    super(message);
    this.name = "WhatsAppError";
    this.statusCode = statusCode;
    this.metaCode = metaCode;
  }
}

interface MetaPhoneProfile {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  name_status?: string;
  status?: string;
  platform_type?: string;
  account_mode?: string;
}

interface MetaPhoneNumberRecord {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface MetaGraphErrorPayload {
  error?: {
    message?: string;
    code?: number;
    type?: string;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface SenderValidationResult {
  expectedSenderE164: string;
  actualSenderE164: string | null;
  matchesExpected: boolean;
  warning: string | null;
}

interface BusinessValidationResult {
  linked: boolean | null;
  warning: string | null;
}

export interface WhatsAppAutomationStatus {
  provider: "meta_cloud_api";
  configured: boolean;
  tokenConfigured: boolean;
  phoneNumberIdConfigured: boolean;
  businessAccountIdConfigured: boolean;
  webhookVerifyTokenConfigured: boolean;
  webhookUrlConfigured: boolean;
  apiEnabled: boolean;
  apiVersion: string;
  expectedSenderE164: string;
  actualSenderE164: string | null;
  senderMatchesExpected: boolean;
  businessAccountLinked: boolean | null;
  canSend: boolean;
  warnings: string[];
}

const DEFAULT_SENDER_NUMBER = "+919746927368";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const BUSINESS_LINK_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedProfile: {
  checkedAt: number;
  profile: MetaPhoneProfile | null;
  warning: string | null;
} | null = null;

let cachedBusinessLinkStatus: {
  checkedAt: number;
  linked: boolean | null;
  warning: string | null;
} | null = null;

function normalizeOutgoingMessage(message: string) {
  return message.trim().slice(0, 1200);
}

function digitsOnly(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function resolveExpectedSenderE164() {
  const configured = env.metaWhatsAppSenderNumber || DEFAULT_SENDER_NUMBER;
  return normalizePhoneE164(configured);
}

function parseGraphErrorPayload(payloadText: string): MetaGraphErrorPayload["error"] | null {
  if (!payloadText) return null;

  try {
    const parsed = JSON.parse(payloadText) as MetaGraphErrorPayload;
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function fetchMetaPhoneProfile(): Promise<{ profile: MetaPhoneProfile | null; warning: string | null }> {
  if (!env.metaAccessToken || !env.metaPhoneNumberId) {
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
      `https://graph.facebook.com/${env.metaApiVersion}/${env.metaPhoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status,platform_type,account_mode`,
      {
        headers: {
          Authorization: `Bearer ${env.metaAccessToken}`
        }
      }
    );

    const bodyText = await readResponseBody(response);
    if (!response.ok) {
      const errorPayload = parseGraphErrorPayload(bodyText);
      const warning = errorPayload?.message
        ? `Meta sender profile lookup failed: ${errorPayload.message} (code ${errorPayload.code ?? "n/a"})`
        : `Meta sender profile lookup failed: ${bodyText || "unknown response"}`;
      cachedProfile = { checkedAt: now, profile: null, warning };
      return { profile: null, warning };
    }

    const profile = JSON.parse(bodyText) as MetaPhoneProfile;
    cachedProfile = { checkedAt: now, profile, warning: null };
    return { profile, warning: null };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Unknown sender profile lookup failure.";
    cachedProfile = { checkedAt: now, profile: null, warning };
    return { profile: null, warning };
  }
}

async function validateBusinessAccountLink(): Promise<BusinessValidationResult> {
  if (!env.metaBusinessAccountId || !env.metaAccessToken || !env.metaPhoneNumberId) {
    return { linked: null, warning: "Business account id, token, or phone number id missing." };
  }

  const now = Date.now();
  if (cachedBusinessLinkStatus && now - cachedBusinessLinkStatus.checkedAt < BUSINESS_LINK_CACHE_TTL_MS) {
    return {
      linked: cachedBusinessLinkStatus.linked,
      warning: cachedBusinessLinkStatus.warning
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${env.metaApiVersion}/${env.metaBusinessAccountId}/phone_numbers?fields=id,display_phone_number,verified_name`,
      {
        headers: {
          Authorization: `Bearer ${env.metaAccessToken}`
        }
      }
    );

    const bodyText = await readResponseBody(response);
    if (!response.ok) {
      const errorPayload = parseGraphErrorPayload(bodyText);
      const warning = errorPayload?.message
        ? `Meta business account check failed: ${errorPayload.message} (code ${errorPayload.code ?? "n/a"})`
        : `Meta business account check failed: ${bodyText || "unknown response"}`;
      cachedBusinessLinkStatus = { checkedAt: now, linked: null, warning };
      return { linked: null, warning };
    }

    const parsed = JSON.parse(bodyText) as { data?: MetaPhoneNumberRecord[] };
    const linked = Array.isArray(parsed.data)
      ? parsed.data.some((entry) => String(entry.id || "") === env.metaPhoneNumberId)
      : false;

    const warning = linked
      ? null
      : `Phone number id ${env.metaPhoneNumberId} is not linked to business account ${env.metaBusinessAccountId}.`;

    cachedBusinessLinkStatus = { checkedAt: now, linked, warning };
    return { linked, warning };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Unknown business account validation error.";
    cachedBusinessLinkStatus = { checkedAt: now, linked: null, warning };
    return { linked: null, warning };
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

function assertWhatsAppEnabled() {
  if (!env.whatsappApiEnabled) {
    throw new WhatsAppError("WhatsApp API disabled. Set WHATSAPP_API_ENABLED=true.", 503);
  }

  if (!env.metaAccessToken || !env.metaPhoneNumberId) {
    throw new WhatsAppError(
      "Meta WhatsApp is not configured. Set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID (or legacy META_WHATSAPP_* aliases).",
      500
    );
  }
}

async function sendViaMetaCloud(params: SendWhatsAppParams) {
  assertWhatsAppEnabled();

  const response = await fetch(
    `https://graph.facebook.com/${env.metaApiVersion}/${env.metaPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.metaAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhoneE164(params.phone).replace(/^\+/, ""),
        type: "text",
        text: { body: params.message, preview_url: false }
      })
    }
  );

  const bodyText = await readResponseBody(response);
  if (!response.ok) {
    const graphError = parseGraphErrorPayload(bodyText);
    const code = graphError?.code;
    const message = graphError?.message || bodyText || "Unknown Meta API error";

    if (code === 133010) {
      throw new WhatsAppError(
        `Meta WhatsApp send failed (#133010 Account not registered). Verify META_BUSINESS_ACCOUNT_ID, META_PHONE_NUMBER_ID, and access token permissions. Raw: ${message}`,
        401,
        code
      );
    }

    if (code === 190) {
      throw new WhatsAppError(
        `Meta WhatsApp send failed (invalid/expired access token). Regenerate META_ACCESS_TOKEN. Raw: ${message}`,
        401,
        code
      );
    }

    if (code === 131026) {
      throw new WhatsAppError(
        `Meta WhatsApp send failed (rate limit exceeded). Raw: ${message}`,
        429,
        code
      );
    }

    throw new WhatsAppError(
      `Meta WhatsApp send failed: ${message}${code ? ` (code ${code})` : ""}`,
      response.status || 500,
      code
    );
  }
}

export async function getWhatsAppAutomationStatus(): Promise<WhatsAppAutomationStatus> {
  const senderValidation = await validateConfiguredSender();
  const businessValidation = await validateBusinessAccountLink();
  const profile = cachedProfile?.profile;

  const warnings: string[] = [];
  if (senderValidation.warning) warnings.push(senderValidation.warning);
  if (businessValidation.warning) warnings.push(businessValidation.warning);

  if (senderValidation.actualSenderE164 && !senderValidation.matchesExpected) {
    warnings.push(
      `Sender mismatch detected. Expected ${senderValidation.expectedSenderE164}, actual ${senderValidation.actualSenderE164}.`
    );
  }
  if (profile?.status && profile.status !== "CONNECTED") {
    warnings.push(
      `Phone number status is ${profile.status}. Expected CONNECTED before sending production messages.`
    );
  }
  if (profile?.name_status && profile.name_status !== "APPROVED") {
    warnings.push(
      `Display name status is ${profile.name_status}. Meta may block sends until display name is approved.`
    );
  }

  const tokenConfigured = Boolean(env.metaAccessToken);
  const phoneNumberIdConfigured = Boolean(env.metaPhoneNumberId);
  const businessAccountIdConfigured = Boolean(env.metaBusinessAccountId);
  const webhookVerifyTokenConfigured = Boolean(env.metaWebhookVerifyToken);
  const webhookUrlConfigured = Boolean(env.metaWebhookUrl);
  const configured = tokenConfigured && phoneNumberIdConfigured;
  const canSend =
    env.whatsappApiEnabled &&
    configured &&
    (senderValidation.actualSenderE164 ? senderValidation.matchesExpected : true) &&
    businessValidation.linked !== false &&
    (!profile?.status || profile.status === "CONNECTED") &&
    (!profile?.name_status || profile.name_status === "APPROVED");

  return {
    provider: "meta_cloud_api",
    configured,
    tokenConfigured,
    phoneNumberIdConfigured,
    businessAccountIdConfigured,
    webhookVerifyTokenConfigured,
    webhookUrlConfigured,
    apiEnabled: env.whatsappApiEnabled,
    apiVersion: env.metaApiVersion,
    expectedSenderE164: senderValidation.expectedSenderE164,
    actualSenderE164: senderValidation.actualSenderE164,
    senderMatchesExpected: senderValidation.actualSenderE164 ? senderValidation.matchesExpected : true,
    businessAccountLinked: businessValidation.linked,
    canSend,
    warnings
  };
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams) {
  const phone = normalizePhoneE164(params.phone);
  const message = normalizeOutgoingMessage(params.message);

  if (!message) {
    throw new WhatsAppError("Message is required.", 400);
  }

  if (!isValidPhoneE164(phone)) {
    throw new WhatsAppError("Invalid phone number format.", 400);
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

function buildLoginMessage(name: string) {
  const firstName = String(name || "")
    .trim()
    .split(/\s+/)[0];
  const helloName = firstName || "there";
  return `Hi ${helloName}, you just logged into your ZERO account. If this was not you, please contact support immediately.`;
}

export async function sendLoginNotification(params: { name: string; phone: string }) {
  await sendWhatsAppMessage({
    phone: params.phone,
    message: buildLoginMessage(params.name)
  });
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

export async function sendChatFollowUp(params: { phone: string; message: string }) {
  await sendWhatsAppMessage({
    phone: params.phone,
    message: params.message
  });
}

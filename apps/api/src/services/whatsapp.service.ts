import axios, { AxiosError } from "axios";
import { env } from "../config/env.js";

const DEFAULT_META_API_VERSION = "v18.0";
const DEFAULT_TEMPLATE_LANGUAGE = "en_US";
const DEFAULT_SENDER_NUMBER = "+919746927368";
const MAX_TEXT_MESSAGE_LENGTH = 1024;
const MAX_TEMPLATE_PARAM_LENGTH = 1024;
const REQUEST_TIMEOUT_MS = 10000;

const TEMPLATE_REQUIRED_CODES = new Set<number>([470, 131047, 131051, 131052]);

interface MetaGraphErrorPayload {
  error?: {
    message?: string;
    code?: number;
    type?: string;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface MetaSendResponse {
  messaging_product?: string;
  contacts?: Array<{ wa_id?: string }>;
  messages?: Array<{ id?: string }>;
}

interface MetaPhoneProfile {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  name_status?: string;
  status?: string;
}

interface MetaPhoneRecord {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface TemplateParameter {
  type: "text";
  text: string;
}

interface TemplateComponent {
  type: "body";
  parameters: TemplateParameter[];
}

interface TemplateSendParams {
  phoneDigits: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

export interface SendWhatsAppParams {
  phone: string;
  message: string;
  templateName?: string;
  templateLanguageCode?: string;
  allowTemplateFallback?: boolean;
}

export interface HeadlessInvoiceData {
  invoiceNumber: string;
  clientName?: string;
  totalAmount: number | string;
  currencySymbol?: string;
  dueDate?: string | Date;
  portalLink: string;
  templateName?: string;
  templateLanguageCode?: string;
}

export interface WhatsAppSendResult {
  success: true;
  channel: "text" | "template";
  messageId?: string;
  statusCode: number;
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

export class WhatsAppError extends Error {
  statusCode: number;
  metaCode?: number;
  metaType?: string;

  constructor(message: string, statusCode = 500, metaCode?: number, metaType?: string) {
    super(message);
    this.name = "WhatsAppError";
    this.statusCode = statusCode;
    this.metaCode = metaCode;
    this.metaType = metaType;
  }
}

function getMetaApiVersion() {
  const configured = String(env.metaApiVersion || "").trim();
  return configured || DEFAULT_META_API_VERSION;
}

function getMetaMessagesUrl() {
  return `https://graph.facebook.com/${getMetaApiVersion()}/${env.metaPhoneNumberId}/messages`;
}

function getMetaHeaders() {
  return {
    Authorization: `Bearer ${env.metaAccessToken}`,
    "Content-Type": "application/json"
  };
}

function normalizePhoneForMeta(phone: string) {
  const rawDigits = String(phone ?? "").replace(/\D/g, "");
  if (!rawDigits) {
    throw new WhatsAppError("Invalid phone number: value is empty after cleanup.", 400);
  }

  const defaultCountryCode = String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "").replace(/\D/g, "");
  let normalized = rawDigits;

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }

  if (normalized.length === 10 && defaultCountryCode) {
    normalized = `${defaultCountryCode}${normalized}`;
  }

  if (normalized.length < 10 || normalized.length > 15) {
    throw new WhatsAppError("Invalid phone number: expected 10 to 15 digits after cleanup.", 400);
  }

  return normalized;
}

function toComparableE164(phone: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function sanitizeTextMessage(message: string) {
  const cleaned = String(message ?? "").trim();
  if (!cleaned) {
    throw new WhatsAppError("Message is required.", 400);
  }
  return cleaned.slice(0, MAX_TEXT_MESSAGE_LENGTH);
}

function sanitizeTemplateText(value: string) {
  return String(value ?? "").trim().slice(0, MAX_TEMPLATE_PARAM_LENGTH);
}

function isMetaErrorResponse(value: unknown): value is { data: MetaGraphErrorPayload; status: number } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { data?: unknown; status?: unknown };
  return typeof candidate.status === "number";
}

function mapAxiosError(error: unknown, context: string): WhatsAppError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<MetaGraphErrorPayload>;
    const response = axiosError.response;

    if (response && isMetaErrorResponse(response)) {
      const metaError = response.data?.error;
      const message = metaError?.message || axiosError.message || "Meta API request failed.";
      const code = typeof metaError?.code === "number" ? metaError.code : undefined;
      const type = metaError?.type;

      if (code === 133010) {
        return new WhatsAppError(
          `${context}: Meta account not registered (#133010). Verify WABA onboarding, phone registration, and display name approval.`,
          401,
          code,
          type
        );
      }

      if (code === 190) {
        return new WhatsAppError(
          `${context}: Meta access token invalid or expired.`,
          401,
          code,
          type
        );
      }

      if (code === 131026) {
        return new WhatsAppError(
          `${context}: Meta rate limit reached. Retry later.`,
          429,
          code,
          type
        );
      }

      return new WhatsAppError(
        `${context}: ${message}${code ? ` (code ${code})` : ""}`,
        response.status || 500,
        code,
        type
      );
    }

    return new WhatsAppError(`${context}: ${axiosError.message}`, 500);
  }

  if (error instanceof WhatsAppError) {
    return error;
  }

  const fallbackMessage = error instanceof Error ? error.message : "Unknown WhatsApp failure.";
  return new WhatsAppError(`${context}: ${fallbackMessage}`, 500);
}

function assertWhatsAppEnabled() {
  if (!env.whatsappApiEnabled) {
    throw new WhatsAppError("WhatsApp API disabled. Set WHATSAPP_API_ENABLED=true.", 503);
  }

  if (!env.metaAccessToken || !env.metaPhoneNumberId) {
    throw new WhatsAppError(
      "Meta WhatsApp config missing. Set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID.",
      500
    );
  }
}

function shouldUseTemplateFallback(error: WhatsAppError) {
  if (typeof error.metaCode === "number" && TEMPLATE_REQUIRED_CODES.has(error.metaCode)) {
    return true;
  }

  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("24") &&
    (message.includes("window") || message.includes("hour") || message.includes("template"))
  );
}

async function postMessagePayload(payload: Record<string, unknown>) {
  try {
    const response = await axios.post<MetaSendResponse>(getMetaMessagesUrl(), payload, {
      headers: getMetaHeaders(),
      timeout: REQUEST_TIMEOUT_MS
    });

    return {
      statusCode: response.status,
      messageId: response.data?.messages?.[0]?.id
    };
  } catch (error) {
    throw mapAxiosError(error, "Meta WhatsApp send failed");
  }
}

async function sendTemplateMessage(params: TemplateSendParams): Promise<WhatsAppSendResult> {
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.phoneDigits,
    type: "template",
    template: {
      name: params.templateName,
      language: {
        code: params.languageCode || DEFAULT_TEMPLATE_LANGUAGE
      },
      ...(params.components && params.components.length > 0 ? { components: params.components } : {})
    }
  };

  const result = await postMessagePayload(payload);
  return {
    success: true,
    channel: "template",
    messageId: result.messageId,
    statusCode: result.statusCode
  };
}

async function sendTextMessage(phoneDigits: string, message: string): Promise<WhatsAppSendResult> {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneDigits,
    type: "text",
    text: {
      preview_url: false,
      body: message
    }
  };

  const result = await postMessagePayload(payload);
  return {
    success: true,
    channel: "text",
    messageId: result.messageId,
    statusCode: result.statusCode
  };
}

function resolveDefaultTemplateName(explicit?: string) {
  const explicitTemplate = String(explicit || "").trim();
  if (explicitTemplate) return explicitTemplate;

  const envTemplate = String(process.env.META_DEFAULT_TEMPLATE_NAME || "").trim();
  return envTemplate;
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<WhatsAppSendResult> {
  assertWhatsAppEnabled();

  const phoneDigits = normalizePhoneForMeta(params.phone);
  const textBody = sanitizeTextMessage(params.message);

  try {
    return await sendTextMessage(phoneDigits, textBody);
  } catch (error) {
    const sendError = error instanceof WhatsAppError ? error : mapAxiosError(error, "Meta WhatsApp send failed");
    const allowFallback = params.allowTemplateFallback ?? true;
    const fallbackTemplateName = resolveDefaultTemplateName(params.templateName);

    if (!allowFallback || !fallbackTemplateName || !shouldUseTemplateFallback(sendError)) {
      throw sendError;
    }

    return sendTemplateMessage({
      phoneDigits,
      templateName: fallbackTemplateName,
      languageCode: params.templateLanguageCode || DEFAULT_TEMPLATE_LANGUAGE,
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: sanitizeTemplateText(textBody)
            }
          ]
        }
      ]
    });
  }
}

function formatInvoiceAmount(totalAmount: number | string, currencySymbol: string) {
  const numeric = Number(totalAmount);
  if (Number.isFinite(numeric)) {
    return `${currencySymbol}${numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${String(totalAmount)}`.trim();
}

function formatInvoiceDueDate(value?: string | Date) {
  if (!value) return "N/A";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

export async function sendHeadlessInvoice(phone: string, invoiceData: HeadlessInvoiceData): Promise<WhatsAppSendResult> {
  assertWhatsAppEnabled();

  const templateName = String(
    invoiceData.templateName || process.env.META_INVOICE_TEMPLATE_NAME || ""
  ).trim();

  if (!templateName) {
    throw new WhatsAppError(
      "META_INVOICE_TEMPLATE_NAME missing. Configure a Meta-approved invoice template for headless sends.",
      500
    );
  }

  const phoneDigits = normalizePhoneForMeta(phone);
  const languageCode = String(invoiceData.templateLanguageCode || process.env.META_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE).trim();
  const amountLabel = formatInvoiceAmount(invoiceData.totalAmount, invoiceData.currencySymbol || "INR ");
  const dueDate = formatInvoiceDueDate(invoiceData.dueDate);

  const bodyParameters: TemplateParameter[] = [
    { type: "text", text: sanitizeTemplateText(invoiceData.clientName || "Customer") },
    { type: "text", text: sanitizeTemplateText(invoiceData.invoiceNumber) },
    { type: "text", text: sanitizeTemplateText(amountLabel) },
    { type: "text", text: sanitizeTemplateText(dueDate) },
    { type: "text", text: sanitizeTemplateText(invoiceData.portalLink) }
  ];

  return sendTemplateMessage({
    phoneDigits,
    templateName,
    languageCode,
    components: [
      {
        type: "body",
        parameters: bodyParameters
      }
    ]
  });
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
  return sendWhatsAppMessage({
    phone: params.phone,
    message: buildLoginMessage(params.name)
  });
}

export async function sendLeadCreatedWhatsApp(params: { name: string; phone: string }) {
  return sendWhatsAppMessage({
    phone: params.phone,
    message: buildLeadWelcomeMessage(params.name)
  });
}

export async function sendLeadFollowUpWhatsApp(params: { phone: string }) {
  return sendWhatsAppMessage({
    phone: params.phone,
    message: "Just checking if you're still interested."
  });
}

export async function sendChatFollowUp(params: { phone: string; message: string }) {
  return sendWhatsAppMessage({
    phone: params.phone,
    message: params.message
  });
}

async function fetchMetaPhoneProfile(): Promise<{ profile: MetaPhoneProfile | null; warning: string | null }> {
  if (!env.metaAccessToken || !env.metaPhoneNumberId) {
    return {
      profile: null,
      warning: "Meta token or phone number id is missing."
    };
  }

  try {
    const response = await axios.get<MetaPhoneProfile>(
      `https://graph.facebook.com/${getMetaApiVersion()}/${env.metaPhoneNumberId}`,
      {
        headers: getMetaHeaders(),
        params: {
          fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status"
        },
        timeout: REQUEST_TIMEOUT_MS
      }
    );

    return {
      profile: response.data,
      warning: null
    };
  } catch (error) {
    const mapped = mapAxiosError(error, "Meta sender profile lookup failed");
    return {
      profile: null,
      warning: mapped.message
    };
  }
}

async function validateBusinessAccountLink(): Promise<{ linked: boolean | null; warning: string | null }> {
  if (!env.metaBusinessAccountId || !env.metaAccessToken || !env.metaPhoneNumberId) {
    return {
      linked: null,
      warning: "Business account id, token, or phone number id missing."
    };
  }

  try {
    const response = await axios.get<{ data?: MetaPhoneRecord[] }>(
      `https://graph.facebook.com/${getMetaApiVersion()}/${env.metaBusinessAccountId}/phone_numbers`,
      {
        headers: getMetaHeaders(),
        params: {
          fields: "id,display_phone_number,verified_name"
        },
        timeout: REQUEST_TIMEOUT_MS
      }
    );

    const linked = Array.isArray(response.data?.data)
      ? response.data.data.some((entry) => String(entry.id || "") === String(env.metaPhoneNumberId))
      : false;

    return {
      linked,
      warning: linked ? null : `Phone number id ${env.metaPhoneNumberId} is not linked to business account ${env.metaBusinessAccountId}.`
    };
  } catch (error) {
    const mapped = mapAxiosError(error, "Meta business account check failed");
    return {
      linked: null,
      warning: mapped.message
    };
  }
}

export async function getWhatsAppAutomationStatus(): Promise<WhatsAppAutomationStatus> {
  const tokenConfigured = Boolean(env.metaAccessToken);
  const phoneNumberIdConfigured = Boolean(env.metaPhoneNumberId);
  const businessAccountIdConfigured = Boolean(env.metaBusinessAccountId);
  const webhookVerifyTokenConfigured = Boolean(env.metaWebhookVerifyToken);
  const webhookUrlConfigured = Boolean(env.metaWebhookUrl);

  const expectedSenderE164 = toComparableE164(env.metaWhatsAppSenderNumber || DEFAULT_SENDER_NUMBER);

  const warnings: string[] = [];

  const profileResult = await fetchMetaPhoneProfile();
  if (profileResult.warning) warnings.push(profileResult.warning);

  const businessLinkResult = await validateBusinessAccountLink();
  if (businessLinkResult.warning) warnings.push(businessLinkResult.warning);

  const actualSenderE164 = profileResult.profile?.display_phone_number
    ? toComparableE164(profileResult.profile.display_phone_number)
    : null;

  const senderMatchesExpected = actualSenderE164
    ? expectedSenderE164.replace(/\D/g, "") === actualSenderE164.replace(/\D/g, "")
    : true;

  if (actualSenderE164 && !senderMatchesExpected) {
    warnings.push(`Sender mismatch detected. Expected ${expectedSenderE164}, actual ${actualSenderE164}.`);
  }

  if (profileResult.profile?.status && profileResult.profile.status !== "CONNECTED") {
    warnings.push(`Phone number status is ${profileResult.profile.status}. Expected CONNECTED.`);
  }

  if (profileResult.profile?.name_status && profileResult.profile.name_status !== "APPROVED") {
    warnings.push(`Display name status is ${profileResult.profile.name_status}. Meta may block sends until approved.`);
  }

  const configured = tokenConfigured && phoneNumberIdConfigured;
  const canSend =
    env.whatsappApiEnabled &&
    configured &&
    senderMatchesExpected &&
    businessLinkResult.linked !== false &&
    (!profileResult.profile?.status || profileResult.profile.status === "CONNECTED") &&
    (!profileResult.profile?.name_status || profileResult.profile.name_status === "APPROVED");

  return {
    provider: "meta_cloud_api",
    configured,
    tokenConfigured,
    phoneNumberIdConfigured,
    businessAccountIdConfigured,
    webhookVerifyTokenConfigured,
    webhookUrlConfigured,
    apiEnabled: env.whatsappApiEnabled,
    apiVersion: getMetaApiVersion(),
    expectedSenderE164,
    actualSenderE164,
    senderMatchesExpected,
    businessAccountLinked: businessLinkResult.linked,
    canSend,
    warnings
  };
}

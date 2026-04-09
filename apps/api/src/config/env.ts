import dotenv from "dotenv";

dotenv.config();

const cleanEnvValue = (value?: string, fallback = "") =>
  (value ?? fallback).trim().replace(/^['"]|['"]$/g, "");

const parseBoolean = (value: string, fallback: boolean) => {
  const normalized = cleanEnvValue(value).toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const rawGoogleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_ID = rawGoogleClientId.trim().replace(/^['"]|['"]$/g, "");

const rawGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_CLIENT_SECRET = rawGoogleClientSecret.trim().replace(/^['"]|['"]$/g, "");

const rawGoogleRedirectUri = process.env.GOOGLE_REDIRECT_URI ?? "";
const GOOGLE_REDIRECT_URI = rawGoogleRedirectUri.trim().replace(/^['"]|['"]$/g, "");

if (!GOOGLE_CLIENT_ID) {
  console.error("❌ GOOGLE_CLIENT_ID is missing or empty after sanitization");
}

const required = ["MONGODB_URI", "JWT_SECRET"] as const;
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env variable: ${key}`);
  }
}

const metaAccessToken = cleanEnvValue(
  process.env.META_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN
);
const metaPhoneNumberId = cleanEnvValue(
  process.env.META_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID
);
const metaSenderNumber = cleanEnvValue(
  process.env.WHATSAPP_BUSINESS_PHONE ||
    process.env.META_WHATSAPP_SENDER_NUMBER ||
    process.env.ADMIN_NOTIFY_WHATSAPP ||
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP
);
const metaBusinessAccountId = cleanEnvValue(
  process.env.META_BUSINESS_ACCOUNT_ID || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID
);
const metaApiVersion = cleanEnvValue(process.env.META_API_VERSION, "v18.0");
const metaWebhookUrl = cleanEnvValue(process.env.META_WEBHOOK_URL);
const whatsappApiEnabled = parseBoolean(process.env.WHATSAPP_API_ENABLED || "true", true);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: cleanEnvValue(process.env.MONGODB_URI)!,
  jwtSecret: cleanEnvValue(process.env.JWT_SECRET)!,
  jwtExpiresIn: cleanEnvValue(process.env.JWT_EXPIRES_IN, "7d"),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  resendApiKey: cleanEnvValue(process.env.RESEND_API_KEY),
  emailFrom: cleanEnvValue(process.env.EMAIL_FROM, "ZERO <noreply@zero.local>"),
  adminNotifyEmail: cleanEnvValue(process.env.ADMIN_NOTIFY_EMAIL, "admin@zero.local"),
  openaiApiKey: cleanEnvValue(process.env.OPENAI_API_KEY),
  openaiModel: cleanEnvValue(process.env.OPENAI_MODEL, "gpt-4o-mini"),
  metaWhatsAppToken: metaAccessToken,
  metaWhatsAppPhoneNumberId: metaPhoneNumberId,
  metaWhatsAppSenderNumber: metaSenderNumber,
  metaAccessToken,
  metaPhoneNumberId,
  metaBusinessAccountId,
  metaApiVersion,
  metaWebhookUrl,
  whatsappApiEnabled,
  metaWebhookVerifyToken: cleanEnvValue(process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN),
  metaAppSecret: cleanEnvValue(process.env.META_APP_SECRET),
  recaptchaSecretKey: cleanEnvValue(process.env.RECAPTCHA_SECRET_KEY),
  recaptchaMinScore: Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5"),
  clientOrigin: cleanEnvValue(process.env.CLIENT_ORIGIN, "http://localhost:3000"),
  webBaseUrl: cleanEnvValue(
    process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_URL || process.env.CLIENT_ORIGIN,
    "http://localhost:3000"
  ),
  googleClientId: GOOGLE_CLIENT_ID,
  googleClientSecret: GOOGLE_CLIENT_SECRET,
  googleRedirectUri: GOOGLE_REDIRECT_URI,
  cloudinary: {
    cloudName: cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: cleanEnvValue(process.env.CLOUDINARY_API_KEY),
    apiSecret: cleanEnvValue(process.env.CLOUDINARY_API_SECRET)
  }
};


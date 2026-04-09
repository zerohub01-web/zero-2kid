import path from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns/promises";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const envValue = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] ?? "").trim();
    if (value) return value;
  }
  return "";
};

const apiVersion = envValue("META_API_VERSION") || "v18.0";
const businessAccountId = envValue("META_BUSINESS_ACCOUNT_ID", "META_WHATSAPP_BUSINESS_ACCOUNT_ID");
const phoneNumberId = envValue("META_PHONE_NUMBER_ID", "META_WHATSAPP_PHONE_NUMBER_ID");
const accessToken = envValue("META_ACCESS_TOKEN", "META_WHATSAPP_TOKEN");
const webhookVerifyToken = envValue("META_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN");
const webhookUrl = envValue("META_WEBHOOK_URL");
const testPhone = envValue("TEST_PHONE");
const sendTestMessage = String(process.env.SEND_TEST_MESSAGE || "false").toLowerCase() === "true";

function mask(value) {
  if (!value) return "";
  if (value.length < 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function ensure(label, value, check, hint) {
  if (!value) {
    throw new Error(`${label} missing. ${hint}`);
  }
  if (!check(value)) {
    throw new Error(`${label} invalid format. ${hint}`);
  }
}

function isHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function graphRequest(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!response.ok) {
    const error = json?.error;
    const details = error
      ? `${error.message || "unknown"} (code ${error.code || "n/a"})`
      : text || "unknown error";
    throw new Error(`Meta request failed: ${details}`);
  }

  return json ?? {};
}

async function run() {
  console.log("=== Meta WhatsApp Credential Verification ===");
  ensure("META_ACCESS_TOKEN", accessToken, (v) => v.length >= 150, "Use a permanent/long-lived token.");
  ensure("META_PHONE_NUMBER_ID", phoneNumberId, (v) => /^\d{10,}$/.test(v), "Use numeric Phone Number ID.");
  ensure(
    "META_BUSINESS_ACCOUNT_ID",
    businessAccountId,
    (v) => /^\d{10,}$/.test(v),
    "Use numeric Business Account ID."
  );
  ensure(
    "META_WEBHOOK_VERIFY_TOKEN",
    webhookVerifyToken,
    (v) => v.length >= 8,
    "Set a non-trivial verify token used by the webhook challenge."
  );
  ensure(
    "META_WEBHOOK_URL",
    webhookUrl,
    isHttpsUrl,
    "Use full HTTPS URL, e.g. https://zero-api-m0an.onrender.com/webhooks/whatsapp."
  );

  console.log(`META_API_VERSION: ${apiVersion}`);
  console.log(`META_BUSINESS_ACCOUNT_ID: ${businessAccountId}`);
  console.log(`META_PHONE_NUMBER_ID: ${phoneNumberId}`);
  console.log(`META_ACCESS_TOKEN: ${mask(accessToken)} (${accessToken.length} chars)`);
  console.log("META_WEBHOOK_VERIFY_TOKEN set: yes");
  console.log(`META_WEBHOOK_URL: ${webhookUrl}`);
  console.log("");

  console.log("0) Verifying webhook host DNS...");
  const webhookHost = new URL(webhookUrl).hostname;
  try {
    const resolved = await dns.lookup(webhookHost);
    console.log(`   OK: ${webhookHost} -> ${resolved.address}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "dns lookup failed";
    throw new Error(`Webhook host does not resolve (${webhookHost}): ${message}`);
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  console.log("1) Verifying business account...");
  const business = await graphRequest(
    `https://graph.facebook.com/${apiVersion}/${businessAccountId}?fields=id,name`,
    { headers: authHeaders }
  );
  console.log(`   OK: ${business.name || "Business"} (${business.id || "n/a"})`);

  console.log("2) Verifying business account phone numbers...");
  const phones = await graphRequest(
    `https://graph.facebook.com/${apiVersion}/${businessAccountId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    { headers: authHeaders }
  );

  const linkedPhones = Array.isArray(phones.data) ? phones.data : [];
  console.log(`   Found ${linkedPhones.length} phone number(s).`);
  linkedPhones.forEach((entry) => {
    console.log(`   - ${entry.display_phone_number || "unknown"} (id ${entry.id || "n/a"})`);
  });

  const linked = linkedPhones.some((entry) => String(entry.id || "") === String(phoneNumberId));
  if (!linked) {
    throw new Error(
      `META_PHONE_NUMBER_ID ${phoneNumberId} is not linked to business account ${businessAccountId}.`
    );
  }
  console.log("   OK: phone number id linked to business account.");

  console.log("3) Verifying phone number profile...");
  const profile = await graphRequest(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status,platform_type,account_mode`,
    { headers: authHeaders }
  );
  console.log(
    `   OK: ${profile.display_phone_number || "unknown"} (${profile.verified_name || "verified-name-missing"})`
  );
  console.log(
    `   Meta status: status=${profile.status || "n/a"}, name_status=${profile.name_status || "n/a"}, code_verification_status=${profile.code_verification_status || "n/a"}`
  );
  if (profile.status && profile.status !== "CONNECTED") {
    console.log(
      "   [WARN] Sender is not CONNECTED yet. Meta may return #133010 until registration/approval is completed."
    );
  }
  if (profile.name_status && profile.name_status !== "APPROVED") {
    console.log(
      "   [WARN] Display name is not APPROVED. Resolve this in WhatsApp Manager before production sends."
    );
  }

  console.log("4) Verifying webhook challenge endpoint...");
  const challenge = "ZERO_VERIFY_CHECK";
  const separator = webhookUrl.includes("?") ? "&" : "?";
  const verifyUrl = `${webhookUrl}${separator}hub.mode=subscribe&hub.challenge=${encodeURIComponent(challenge)}&hub.verify_token=${encodeURIComponent(webhookVerifyToken)}`;
  const webhookResponse = await fetch(verifyUrl, { method: "GET" });
  const webhookBody = (await webhookResponse.text()).trim();

  if (webhookResponse.status !== 200 || webhookBody !== challenge) {
    throw new Error(
      `Webhook verify failed. Expected HTTP 200 + challenge echo, got HTTP ${webhookResponse.status} body="${webhookBody}".`
    );
  }
  console.log("   OK: webhook verification endpoint returned 200 and echoed challenge.");

  if (sendTestMessage) {
    if (!testPhone) {
      throw new Error("SEND_TEST_MESSAGE=true requires TEST_PHONE to be set.");
    }

    const normalizedTestPhone = testPhone.replace(/\D/g, "");
    if (normalizedTestPhone.length < 10) {
      throw new Error("TEST_PHONE is invalid.");
    }

    console.log("5) Sending test WhatsApp message...");
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTestPhone,
      type: "text",
      text: {
        preview_url: false,
        body: "ZERO WhatsApp integration test successful."
      }
    };
    const sendResult = await graphRequest(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload)
      }
    );
    const messageId = sendResult?.messages?.[0]?.id || "n/a";
    console.log(`   OK: message sent (id ${messageId})`);
  } else {
    console.log("5) Message send test skipped (set SEND_TEST_MESSAGE=true to enable).");
  }

  console.log("");
  console.log("SUCCESS: Meta WhatsApp credentials verified.");
}

run().catch((error) => {
  console.error("FAILED:", error.message);
  process.exitCode = 1;
});

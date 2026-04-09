import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import axios from "axios";

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
const testPhone = envValue("TEST_PHONE").replace(/\D/g, "");
const testTemplateName = envValue("TEST_TEMPLATE_NAME", "META_INVOICE_TEMPLATE_NAME");
const testTemplateLanguage = envValue("TEST_TEMPLATE_LANGUAGE", "META_TEMPLATE_LANGUAGE") || "en_US";
const sendTextTest = String(process.env.SEND_TEXT_TEST || "false").toLowerCase() === "true";

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} missing`);
  }
}

async function callMeta(method, url, data) {
  return axios({
    method,
    url,
    data,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    validateStatus: () => true
  });
}

function printResult(label, response) {
  const statusLabel = response.status === 200 ? "PASS" : "FAIL";
  console.log(`[${statusLabel}] ${label} -> HTTP ${response.status}`);
  if (response.status !== 200) {
    const errorMessage = response.data?.error?.message || JSON.stringify(response.data);
    console.log(`       ${errorMessage}`);
  }
}

async function run() {
  requireEnv("META_ACCESS_TOKEN", accessToken);
  requireEnv("META_BUSINESS_ACCOUNT_ID", businessAccountId);
  requireEnv("META_PHONE_NUMBER_ID", phoneNumberId);

  console.log("=== Meta WhatsApp Headless Diagnostic ===");
  console.log(`API Version: ${apiVersion}`);
  console.log(`Business Account ID: ${businessAccountId}`);
  console.log(`Phone Number ID: ${phoneNumberId}`);
  console.log("");

  let failed = false;

  const accountRes = await callMeta(
    "GET",
    `https://graph.facebook.com/${apiVersion}/${businessAccountId}?fields=id,name`
  );
  printResult("Business Account Lookup", accountRes);
  if (accountRes.status !== 200) failed = true;

  const businessPhonesRes = await callMeta(
    "GET",
    `https://graph.facebook.com/${apiVersion}/${businessAccountId}/phone_numbers?fields=id,display_phone_number,verified_name,status,name_status`
  );
  printResult("Business Phone Numbers Lookup", businessPhonesRes);
  if (businessPhonesRes.status !== 200) failed = true;

  const phoneProfileRes = await callMeta(
    "GET",
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,status,name_status,code_verification_status`
  );
  printResult("Phone Profile Lookup", phoneProfileRes);
  if (phoneProfileRes.status !== 200) failed = true;

  if (testPhone) {
    if (sendTextTest) {
      const textRes = await callMeta(
        "POST",
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: testPhone,
          type: "text",
          text: {
            preview_url: false,
            body: "ZERO headless diagnostic text message"
          }
        }
      );
      printResult("Headless Text Send Test", textRes);
      if (textRes.status !== 200) failed = true;
    } else if (testTemplateName) {
      const templateRes = await callMeta(
        "POST",
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: testPhone,
          type: "template",
          template: {
            name: testTemplateName,
            language: { code: testTemplateLanguage },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Customer" },
                  { type: "text", text: "INV-DIAG-001" },
                  { type: "text", text: "INR 1.00" },
                  { type: "text", text: "2099-12-31" },
                  { type: "text", text: "https://www.zeroops.in" }
                ]
              }
            ]
          }
        }
      );
      printResult("Headless Template Send Test", templateRes);
      if (templateRes.status !== 200) failed = true;
    } else {
      console.log("[SKIP] Send Test -> Set TEST_TEMPLATE_NAME or SEND_TEXT_TEST=true");
    }
  } else {
    console.log("[SKIP] Send Test -> Set TEST_PHONE to run message diagnostics");
  }

  console.log("");
  if (failed) {
    console.log("DIAGNOSTIC RESULT: FAIL (one or more Meta calls did not return HTTP 200)");
    process.exitCode = 1;
    return;
  }

  console.log("DIAGNOSTIC RESULT: PASS (all executed Meta calls returned HTTP 200)");
}

run().catch((error) => {
  console.error("DIAGNOSTIC RESULT: FAIL", error.message);
  process.exitCode = 1;
});

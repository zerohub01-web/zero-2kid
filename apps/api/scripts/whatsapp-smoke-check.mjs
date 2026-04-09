const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
const webhookToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "zero_whatsapp_webhook_secret_2026";

async function request(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { response, text, json };
}

async function run() {
  console.log(`=== WhatsApp Smoke Check (${baseUrl}) ===`);

  const health = await request(`${baseUrl}/health`);
  console.log(`[health] HTTP ${health.response.status}`);
  if (health.json) {
    console.log(
      `         status=${health.json.status}, db=${health.json.db}, whatsappStatus=${health.json.whatsappStatus}`
    );
    if (Array.isArray(health.json.whatsappWarnings) && health.json.whatsappWarnings.length) {
      console.log(`         warnings=${health.json.whatsappWarnings.join(" | ")}`);
    }
  }

  const verify = await request(
    `${baseUrl}/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=VERIFY_OK&hub.verify_token=${encodeURIComponent(
      webhookToken
    )}`
  );
  console.log(`[webhooks/whatsapp verify] HTTP ${verify.response.status} body=${verify.text}`);

  const legacyVerify = await request(
    `${baseUrl}/webhook/whatsapp?hub.mode=subscribe&hub.challenge=VERIFY_OK_LEGACY&hub.verify_token=${encodeURIComponent(
      webhookToken
    )}`
  );
  console.log(`[webhook/whatsapp verify] HTTP ${legacyVerify.response.status} body=${legacyVerify.text}`);

  const login = await request(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "invalid@example.com",
      password: "invalid-password"
    })
  });
  console.log(`[api/auth/login invalid] HTTP ${login.response.status}`);

  const allPass =
    health.response.status === 200 &&
    verify.response.status === 200 &&
    legacyVerify.response.status === 200;

  if (!allPass) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("Smoke check failed:", error.message);
  process.exitCode = 1;
});


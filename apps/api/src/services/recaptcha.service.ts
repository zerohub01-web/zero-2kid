import { env } from "../config/env.js";

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  "error-codes"?: string[];
}

export async function verifyRecaptchaToken(token: string, ipAddress: string) {
  if (!env.recaptchaSecretKey) {
    console.error("[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured");
    return { ok: false as const, reason: "captcha-not-configured" };
  }

  if (!token) {
    return { ok: false as const, reason: "captcha-token-missing" };
  }

  const payload = new URLSearchParams({
    secret: env.recaptchaSecretKey,
    response: token
  });

  if (ipAddress) {
    payload.set("remoteip", ipAddress);
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    });

    const parsed = (await response.json()) as RecaptchaResponse;

    if (!parsed.success) {
      return {
        ok: false as const,
        reason: "Captcha verification failed.",
        details: parsed["error-codes"] ?? []
      };
    }

    if (typeof parsed.score === "number" && parsed.score < env.recaptchaMinScore) {
      return {
        ok: false as const,
        reason: "Captcha score too low."
      };
    }

    return { ok: true as const };
  } catch (error) {
    console.error("[reCAPTCHA] Verification failed:", error);
    return { ok: false as const, reason: "captcha-verification-error" };
  }
}

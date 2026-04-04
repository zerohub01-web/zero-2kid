import { env } from "../config/env.js";

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  "error-codes"?: string[];
}

export type RecaptchaFailureCode =
  | "captcha_required"
  | "captcha_invalid"
  | "captcha_expired"
  | "captcha_unavailable";

type RecaptchaVerificationResult =
  | { ok: true }
  | {
      ok: false;
      code: RecaptchaFailureCode;
      reason: string;
      details?: string[];
    };

function mapRecaptchaFailure(errorCodes: string[] = []): RecaptchaVerificationResult {
  if (errorCodes.includes("missing-input-response")) {
    return {
      ok: false,
      code: "captcha_required",
      reason: "Complete the CAPTCHA security check before submitting.",
      details: errorCodes
    };
  }

  if (errorCodes.includes("timeout-or-duplicate")) {
    return {
      ok: false,
      code: "captcha_expired",
      reason: "Your security check expired. Please complete it again.",
      details: errorCodes
    };
  }

  if (errorCodes.includes("missing-input-secret") || errorCodes.includes("invalid-input-secret")) {
    return {
      ok: false,
      code: "captcha_unavailable",
      reason: "The CAPTCHA security check is temporarily unavailable. Please try again shortly.",
      details: errorCodes
    };
  }

  return {
    ok: false,
    code: "captcha_invalid",
    reason: "We couldn't verify the security check. Please try again.",
    details: errorCodes
  };
}

export async function verifyRecaptchaToken(token: string, ipAddress: string) {
  if (!env.recaptchaSecretKey) {
    console.error("[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured");
    return {
      ok: false as const,
      code: "captcha_unavailable" as const,
      reason: "The CAPTCHA security check is temporarily unavailable. Please try again shortly."
    };
  }

  if (!token) {
    return {
      ok: false as const,
      code: "captcha_required" as const,
      reason: "Complete the CAPTCHA security check before submitting."
    };
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
      console.warn("[reCAPTCHA] Provider rejected token:", parsed["error-codes"] ?? []);
      return mapRecaptchaFailure(parsed["error-codes"] ?? []);
    }

    if (typeof parsed.score === "number" && parsed.score < env.recaptchaMinScore) {
      return {
        ok: false as const,
        code: "captcha_invalid" as const,
        reason: "We couldn't verify the security check. Please try again.",
        details: ["low-score"]
      };
    }

    return { ok: true as const };
  } catch (error) {
    console.error("[reCAPTCHA] Verification failed:", error);
    return {
      ok: false as const,
      code: "captcha_unavailable" as const,
      reason: "The CAPTCHA security check is temporarily unavailable. Please try again shortly."
    };
  }
}

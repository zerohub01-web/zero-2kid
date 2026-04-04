import { env } from "../config/env.js";

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
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

interface VerifyRecaptchaOptions {
  expectedAction?: string;
}

function normalizeHostname(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).hostname.trim().toLowerCase();
  } catch {
    return raw
      .replace(/^[a-z]+:\/\//i, "")
      .split("/")[0]
      .split(":")[0]
      .trim()
      .toLowerCase();
  }
}

function expandEquivalentHostnames(hostname: string): string[] {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return [];

  if (normalized.startsWith("www.")) {
    return [normalized, normalized.slice(4)].filter(Boolean);
  }

  return [normalized, `www.${normalized}`];
}

function getAllowedHostnames(): string[] {
  return Array.from(
    new Set(
      [env.clientOrigin, env.webBaseUrl]
        .flatMap((value) => expandEquivalentHostnames(value))
        .filter(Boolean)
    )
  );
}

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

export async function verifyRecaptchaToken(
  token: string,
  ipAddress: string,
  options: VerifyRecaptchaOptions = {}
) {
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
  const expectedAction = String(options.expectedAction ?? "").trim();
  const allowedHostnames = getAllowedHostnames();

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
      console.warn("[reCAPTCHA] Provider rejected token:", {
        errors: parsed["error-codes"] ?? [],
        hostname: parsed.hostname ?? null,
        action: parsed.action ?? null,
        score: typeof parsed.score === "number" ? parsed.score : null,
        expectedAction: expectedAction || null,
        allowedHostnames
      });
      return mapRecaptchaFailure(parsed["error-codes"] ?? []);
    }

    if (expectedAction && parsed.action && parsed.action !== expectedAction) {
      console.warn("[reCAPTCHA] Token action mismatch:", {
        receivedAction: parsed.action,
        expectedAction,
        hostname: parsed.hostname ?? null
      });
      return {
        ok: false as const,
        code: "captcha_invalid" as const,
        reason: "We couldn't verify the security check. Please try again.",
        details: ["unexpected-action"]
      };
    }

    const verifiedHostname = normalizeHostname(parsed.hostname ?? "");
    if (verifiedHostname && allowedHostnames.length > 0 && !allowedHostnames.includes(verifiedHostname)) {
      console.warn("[reCAPTCHA] Token hostname mismatch:", {
        hostname: verifiedHostname,
        allowedHostnames,
        action: parsed.action ?? null
      });
      return {
        ok: false as const,
        code: "captcha_invalid" as const,
        reason: "We couldn't verify the security check. Please try again.",
        details: ["unexpected-hostname"]
      };
    }

    if (typeof parsed.score === "number" && parsed.score < env.recaptchaMinScore) {
      console.warn("[reCAPTCHA] Token score below threshold:", {
        score: parsed.score,
        minScore: env.recaptchaMinScore,
        hostname: parsed.hostname ?? null,
        action: parsed.action ?? null
      });
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

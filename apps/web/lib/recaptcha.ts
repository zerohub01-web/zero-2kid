export const RECAPTCHA_PLACEHOLDER_SITE_KEY = "your_site_key_here";
const RECAPTCHA_SCRIPT_ID_PREFIX = "recaptcha-script";

export type CaptchaErrorCode =
  | "captcha_required"
  | "captcha_invalid"
  | "captcha_expired"
  | "captcha_unavailable";

export type RecaptchaMode = "checkbox" | "v3";

export type RecaptchaWidgetState = "idle" | "loading" | "ready" | "verified" | "expired" | "error";

export interface RecaptchaWidgetStatus {
  state: RecaptchaWidgetState;
  message: string;
  code?: CaptchaErrorCode;
}

const recaptchaScriptPromises = new Map<RecaptchaMode, Promise<void>>();

export function getRecaptchaSiteKey(): string {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "").trim();
}

export function getRecaptchaMode(): RecaptchaMode {
  const rawMode = (process.env.NEXT_PUBLIC_RECAPTCHA_MODE ?? "").trim().toLowerCase();
  if (rawMode === "v3" || rawMode === "score" || rawMode === "invisible") return "v3";
  return "checkbox";
}

export function isRecaptchaSiteKeyConfigured(siteKey = getRecaptchaSiteKey()): boolean {
  return Boolean(siteKey) && siteKey !== RECAPTCHA_PLACEHOLDER_SITE_KEY;
}

export function isCaptchaErrorCode(value: unknown): value is CaptchaErrorCode {
  return (
    value === "captcha_required" ||
    value === "captcha_invalid" ||
    value === "captcha_expired" ||
    value === "captcha_unavailable"
  );
}

export function extractCaptchaErrorCode(payload: unknown): CaptchaErrorCode | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const code = String((payload as { code?: unknown }).code ?? "").trim();
  return isCaptchaErrorCode(code) ? code : undefined;
}

export function getCaptchaErrorMessage(code?: string, fallback?: string): string {
  switch (code) {
    case "captcha_required":
      return "Complete the CAPTCHA security check before submitting.";
    case "captcha_invalid":
      return "We couldn't verify the security check. Please try again.";
    case "captcha_expired":
      return "Your security check expired. Please complete it again.";
    case "captcha_unavailable":
      return "The CAPTCHA security check is temporarily unavailable. Please try again shortly.";
    default: {
      const cleanFallback = String(fallback ?? "").trim();
      return cleanFallback || "We couldn't verify the security check. Please try again.";
    }
  }
}

function getScriptId(mode: RecaptchaMode) {
  return `${RECAPTCHA_SCRIPT_ID_PREFIX}-${mode}`;
}

export function loadRecaptchaScript(
  siteKey = getRecaptchaSiteKey(),
  mode: RecaptchaMode = getRecaptchaMode()
): Promise<void> {
  if (!isRecaptchaSiteKeyConfigured(siteKey)) {
    return Promise.reject(new Error("captcha_unavailable"));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("captcha_unavailable"));
  }

  if (window.grecaptcha?.render && (mode === "checkbox" || window.grecaptcha.execute)) {
    return new Promise<void>((resolve) => {
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) {
        resolve();
        return;
      }

      grecaptcha.ready(() => resolve());
    });
  }

  const existingPromise = recaptchaScriptPromises.get(mode);
  if (existingPromise) {
    return existingPromise;
  }

  const scriptPromise = new Promise<void>((resolve, reject) => {
    const onReady = () => {
      if (!window.grecaptcha?.ready) {
        recaptchaScriptPromises.delete(mode);
        reject(new Error("captcha_unavailable"));
        return;
      }

      window.grecaptcha.ready(() => resolve());
    };

    const onError = () => {
      recaptchaScriptPromises.delete(mode);
      reject(new Error("captcha_unavailable"));
    };

    const existingScript = document.getElementById(getScriptId(mode)) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.grecaptcha?.render) {
        onReady();
        return;
      }

      existingScript.addEventListener("load", onReady, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = getScriptId(mode);
    script.src =
      mode === "checkbox"
        ? "https://www.google.com/recaptcha/api.js?render=explicit"
        : `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });

  recaptchaScriptPromises.set(mode, scriptPromise);
  return scriptPromise;
}

export async function executeRecaptchaAction(
  action: string,
  siteKey = getRecaptchaSiteKey()
): Promise<string> {
  if (!isRecaptchaSiteKeyConfigured(siteKey)) {
    throw new Error("captcha_unavailable");
  }

  await loadRecaptchaScript(siteKey, "v3");

  if (!window.grecaptcha?.execute) {
    throw new Error("captcha_unavailable");
  }

  try {
    const token = await window.grecaptcha.execute(siteKey, { action });
    if (!token) {
      throw new Error("captcha_invalid");
    }
    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.warn("[reCAPTCHA] Frontend execute failed:", {
      action,
      mode: "v3",
      siteKeyConfigured: isRecaptchaSiteKeyConfigured(siteKey),
      error: message || String(error ?? "")
    });
    throw new Error(message || "captcha_unavailable");
  }
}

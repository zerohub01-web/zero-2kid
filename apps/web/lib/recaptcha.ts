export const RECAPTCHA_PLACEHOLDER_SITE_KEY = "your_site_key_here";
const RECAPTCHA_SCRIPT_ID = "recaptcha-checkbox-script";

export type CaptchaErrorCode =
  | "captcha_required"
  | "captcha_invalid"
  | "captcha_expired"
  | "captcha_unavailable";

export type RecaptchaWidgetState = "idle" | "loading" | "ready" | "verified" | "expired" | "error";

export interface RecaptchaWidgetStatus {
  state: RecaptchaWidgetState;
  message: string;
  code?: CaptchaErrorCode;
}

let recaptchaScriptPromise: Promise<void> | null = null;

export function getRecaptchaSiteKey(): string {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "").trim();
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

export function loadRecaptchaScript(siteKey = getRecaptchaSiteKey()): Promise<void> {
  if (!isRecaptchaSiteKeyConfigured(siteKey)) {
    return Promise.reject(new Error("captcha_unavailable"));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("captcha_unavailable"));
  }

  if (window.grecaptcha?.render) {
    return new Promise<void>((resolve) => {
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) {
        resolve();
        return;
      }

      grecaptcha.ready(() => resolve());
    });
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise<void>((resolve, reject) => {
    const onReady = () => {
      if (!window.grecaptcha?.ready) {
        recaptchaScriptPromise = null;
        reject(new Error("captcha_unavailable"));
        return;
      }

      window.grecaptcha.ready(() => resolve());
    };

    const onError = () => {
      recaptchaScriptPromise = null;
      reject(new Error("captcha_unavailable"));
    };

    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
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
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
}

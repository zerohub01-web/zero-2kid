"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  CaptchaErrorCode,
  RecaptchaMode,
  RecaptchaWidgetStatus,
  getCaptchaErrorMessage,
  getRecaptchaMode,
  getRecaptchaSiteKey,
  isRecaptchaSiteKeyConfigured,
  loadRecaptchaScript
} from "../../lib/recaptcha";

export interface RecaptchaCheckboxHandle {
  reset: () => void;
  getToken: () => string;
}

interface RecaptchaCheckboxProps {
  className?: string;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
  onTokenChange: (token: string) => void;
  onStatusChange?: (status: RecaptchaWidgetStatus) => void;
}

function statusClassName(state: RecaptchaWidgetStatus["state"]) {
  if (state === "verified") return "text-emerald-700";
  if (state === "loading") return "text-[var(--muted)]";
  return "text-red-600";
}

export const RecaptchaCheckbox = forwardRef<RecaptchaCheckboxHandle, RecaptchaCheckboxProps>(
  function RecaptchaCheckbox(
    { className = "", theme = "light", size = "normal", onTokenChange, onStatusChange },
    ref
  ) {
    const widgetContainerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<number | null>(null);
    const onTokenChangeRef = useRef(onTokenChange);
    const onStatusChangeRef = useRef(onStatusChange);
    const siteKey = getRecaptchaSiteKey();
    const mode: RecaptchaMode = getRecaptchaMode();
    const [status, setStatus] = useState<RecaptchaWidgetStatus>(() =>
      isRecaptchaSiteKeyConfigured(siteKey) && mode === "checkbox"
        ? { state: "loading", message: "Loading security check..." }
        : {
            state: "error",
            code: "captcha_unavailable",
            message: getCaptchaErrorMessage("captcha_unavailable")
          }
    );

    useEffect(() => {
      onTokenChangeRef.current = onTokenChange;
    }, [onTokenChange]);

    useEffect(() => {
      onStatusChangeRef.current = onStatusChange;
    }, [onStatusChange]);

    const publishStatus = (nextStatus: RecaptchaWidgetStatus) => {
      setStatus(nextStatus);
      onStatusChangeRef.current?.(nextStatus);
    };

    const publishToken = (token: string) => {
      onTokenChangeRef.current(token);
    };

    const resetWidget = (nextStatus?: RecaptchaWidgetStatus) => {
      if (typeof window !== "undefined" && widgetIdRef.current !== null && window.grecaptcha?.reset) {
        window.grecaptcha.reset(widgetIdRef.current);
      }

      publishToken("");
      publishStatus(nextStatus ?? { state: "ready", message: "" });
    };

    useImperativeHandle(
      ref,
      () => ({
        reset: () => resetWidget(),
        getToken: () => {
          if (typeof window === "undefined" || widgetIdRef.current === null || !window.grecaptcha?.getResponse) {
            return "";
          }

          return window.grecaptcha.getResponse(widgetIdRef.current);
        }
      }),
      []
    );

    useEffect(() => {
      publishToken("");

      if (!isRecaptchaSiteKeyConfigured(siteKey)) {
        publishStatus({
          state: "error",
          code: "captcha_unavailable",
          message: getCaptchaErrorMessage("captcha_unavailable")
        });
        return;
      }

      if (mode !== "checkbox") {
        publishStatus({ state: "ready", message: "" });
        return;
      }

      let cancelled = false;

      const handleWidgetError = (code: CaptchaErrorCode, message: string) => {
        if (cancelled) return;
        publishToken("");
        publishStatus({ state: "error", code, message });
      };

      publishStatus({ state: "loading", message: "Loading security check..." });

      loadRecaptchaScript(siteKey, "checkbox")
        .then(() => {
          if (cancelled || !widgetContainerRef.current || !window.grecaptcha?.render) {
            return;
          }

          if (widgetIdRef.current !== null) {
            publishStatus({ state: "ready", message: "" });
            return;
          }

          widgetIdRef.current = window.grecaptcha.render(widgetContainerRef.current, {
            sitekey: siteKey,
            theme,
            size,
            callback: (token: string) => {
              if (cancelled) return;
              publishToken(token);
              publishStatus({
                state: "verified",
                message: "Security check complete. You can submit now."
              });
            },
            "expired-callback": () => {
              if (cancelled) return;
              publishToken("");
              publishStatus({
                state: "expired",
                code: "captcha_expired",
                message: getCaptchaErrorMessage("captcha_expired")
              });
            },
            "error-callback": () => {
              handleWidgetError("captcha_unavailable", getCaptchaErrorMessage("captcha_unavailable"));
            }
          });

          publishStatus({ state: "ready", message: "" });
        })
        .catch(() => {
          handleWidgetError("captcha_unavailable", getCaptchaErrorMessage("captcha_unavailable"));
        });

      return () => {
        cancelled = true;
      };
    }, [mode, siteKey, size, theme]);

    const shouldShowStatus = status.state !== "ready" && status.message;

    return (
      <div className={className}>
        <div ref={widgetContainerRef} className="min-h-[78px]" />
        {shouldShowStatus ? (
          <p aria-live="polite" className={`mt-2 text-xs font-medium ${statusClassName(status.state)}`}>
            {status.message}
          </p>
        ) : null}
      </div>
    );
  }
);

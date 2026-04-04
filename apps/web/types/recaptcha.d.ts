declare global {
  interface GrecaptchaRenderParameters {
    sitekey: string;
    callback?: (token: string) => void;
    theme?: "light" | "dark";
    size?: "normal" | "compact" | "invisible";
    "expired-callback"?: () => void;
    "error-callback"?: () => void;
  }

  interface Grecaptcha {
    ready: (callback: () => void) => void;
    render: (container: string | HTMLElement, parameters: GrecaptchaRenderParameters) => number;
    reset: (widgetId?: number) => void;
    getResponse: (widgetId?: number) => string;
    execute?: (siteKey: string, options: { action: string }) => Promise<string>;
  }

  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

export {};

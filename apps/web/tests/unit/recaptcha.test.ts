import { describe, expect, test } from "vitest";
import {
  getRecaptchaMode,
  extractCaptchaErrorCode,
  getCaptchaErrorMessage,
  isRecaptchaSiteKeyConfigured
} from "../../lib/recaptcha";

describe("reCAPTCHA web helpers", () => {
  test("W6.1 - identifies configured site keys", () => {
    expect(isRecaptchaSiteKeyConfigured("test-site-key")).toBe(true);
    expect(isRecaptchaSiteKeyConfigured("your_site_key_here")).toBe(false);
    expect(isRecaptchaSiteKeyConfigured("")).toBe(false);
  });

  test("W6.2 - maps structured CAPTCHA errors to user-friendly copy", () => {
    expect(getCaptchaErrorMessage("captcha_required")).toMatch(/Complete the CAPTCHA/i);
    expect(getCaptchaErrorMessage("captcha_expired")).toMatch(/expired/i);
    expect(getCaptchaErrorMessage("captcha_unavailable")).toMatch(/temporarily unavailable/i);
  });

  test("W6.3 - extracts CAPTCHA error codes from API payloads", () => {
    expect(extractCaptchaErrorCode({ code: "captcha_invalid" })).toBe("captcha_invalid");
    expect(extractCaptchaErrorCode({ code: "unknown" })).toBeUndefined();
    expect(extractCaptchaErrorCode(null)).toBeUndefined();
  });

  test("W6.4 - defaults recaptcha mode to checkbox and supports v3 override", () => {
    delete process.env.NEXT_PUBLIC_RECAPTCHA_MODE;
    expect(getRecaptchaMode()).toBe("checkbox");

    process.env.NEXT_PUBLIC_RECAPTCHA_MODE = "v3";
    expect(getRecaptchaMode()).toBe("v3");
  });
});

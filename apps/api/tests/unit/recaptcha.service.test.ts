import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const originalEnv = { ...process.env };

describe("reCAPTCHA verification service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      MONGODB_URI: "mongodb://localhost:27017/zero-test",
      JWT_SECRET: "test-secret",
      RECAPTCHA_SECRET_KEY: "test-recaptcha-secret"
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  test("U6.7 - returns captcha_required when token is missing", async () => {
    const { verifyRecaptchaToken } = await import("../../src/services/recaptcha.service");
    const result = await verifyRecaptchaToken("", "127.0.0.1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("captcha_required");
    }
  });

  test("U6.8 - returns captcha_expired when provider marks token as duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          success: false,
          "error-codes": ["timeout-or-duplicate"]
        })
      }))
    );

    const { verifyRecaptchaToken } = await import("../../src/services/recaptcha.service");
    const result = await verifyRecaptchaToken("expired-token", "127.0.0.1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("captcha_expired");
    }
  });

  test("U6.9 - accepts a valid provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          success: true
        })
      }))
    );

    const { verifyRecaptchaToken } = await import("../../src/services/recaptcha.service");
    const result = await verifyRecaptchaToken("valid-token", "127.0.0.1");

    expect(result).toEqual({ ok: true });
  });

  test("U6.10 - rejects low-score v3 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          success: true,
          score: 0.1
        })
      }))
    );

    const { verifyRecaptchaToken } = await import("../../src/services/recaptcha.service");
    const result = await verifyRecaptchaToken("valid-token", "127.0.0.1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("captcha_invalid");
    }
  });
});

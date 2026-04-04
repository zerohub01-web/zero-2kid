import { describe, expect, test } from "vitest";
import { createBookingSchema } from "../../src/utils/validation";

describe("Booking Validation Schema", () => {
  test("U6.4 - rejects empty body", () => {
    const result = createBookingSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });

  test("U6.5 - accepts valid booking payload", () => {
    const result = createBookingSchema.safeParse({
      body: {
        name: "Test User",
        email: "test@zeroops.in",
        phone: "9999999999",
        businessType: "Tech / SaaS Startup",
        service: "Website Development",
        message: "Need a full website and automation setup."
      }
    });

    expect(result.success).toBe(true);
  });

  test("U6.6 - rejects invalid email", () => {
    const result = createBookingSchema.safeParse({
      body: {
        name: "Test User",
        email: "bad-email",
        phone: "9999999999",
        businessType: "Startup",
        service: "Website Development",
        message: "Need a website."
      }
    });

    expect(result.success).toBe(false);
  });
});

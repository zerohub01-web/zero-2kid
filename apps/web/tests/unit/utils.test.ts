import { describe, expect, test } from "vitest";
import { buildWhatsAppLink } from "../../utils/whatsapp";

describe("WhatsApp Utils", () => {
  test("U6.1 - buildWhatsAppLink basic", () => {
    const link = buildWhatsAppLink("918590464379", "Hello");
    expect(link).toContain("wa.me/918590464379");
    expect(link).toContain("Hello");
  });

  test("U6.2 - strips non-digits from phone", () => {
    const link = buildWhatsAppLink("+91-859-046-4379", "Hi");
    expect(link).toContain("wa.me/918590464379");
  });

  test("U6.3 - encodes special chars", () => {
    const link = buildWhatsAppLink("918590464379", "Hello ₹30,000 → test");
    expect(link).not.toContain(" ");
    expect(link).toContain("wa.me");
  });
});

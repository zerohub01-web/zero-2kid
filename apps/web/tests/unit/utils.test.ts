import { describe, expect, test } from "vitest";
import { buildWhatsAppLink } from "../../utils/whatsapp";

describe("WhatsApp Utils", () => {
  test("U6.1 - buildWhatsAppLink basic", () => {
    const link = buildWhatsAppLink("919746927368", "Hello");
    expect(link).toContain("wa.me/919746927368");
    expect(link).toContain("Hello");
  });

  test("U6.2 - strips non-digits from phone", () => {
    const link = buildWhatsAppLink("+91-974-692-7368", "Hi");
    expect(link).toContain("wa.me/919746927368");
  });

  test("U6.3 - encodes special chars", () => {
    const link = buildWhatsAppLink("919746927368", "Hello amount 30000 test");
    expect(link).not.toContain(" ");
    expect(link).toContain("wa.me");
  });
});

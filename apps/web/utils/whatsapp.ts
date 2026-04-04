export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = String(phone ?? "").replace(/\D/g, "");
  const encoded = encodeURIComponent(String(message ?? ""));
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export function buildAdminPing(formLabel: string, fields: Record<string, string>): string {
  const lines = Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return `Alert: ${formLabel} - ZeroOps\n-----------------------\n${lines}\n-----------------------\n${new Date().toLocaleString(
    "en-IN",
    { timeZone: "Asia/Kolkata" }
  )}`;
}


const htmlTagRegex = /<\/?[^>]+(>|$)/g;
const controlCharsRegex = /[\u0000-\u001F\u007F]/g;

function baseClean(value: string) {
  return value.replace(controlCharsRegex, "").replace(htmlTagRegex, "").trim();
}

export function sanitizeSingleLine(value: unknown, maxLength = 160) {
  const clean = baseClean(String(value ?? "")).replace(/\s+/g, " ");
  return clean.slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength = 1200) {
  const clean = baseClean(String(value ?? ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return clean.slice(0, maxLength);
}

export function sanitizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function sanitizePhone(value: unknown) {
  const raw = String(value ?? "").trim().replace(/[^\d+]/g, "");
  if (!raw) return "";

  if (raw.startsWith("+")) {
    return `+${raw.slice(1).replace(/\+/g, "")}`.slice(0, 20);
  }

  return raw.replace(/\+/g, "").slice(0, 20);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import crypto from "crypto";

const TTL_HOURS = 72;

function getPortalSecret() {
  const secret = process.env.PORTAL_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("PORTAL_TOKEN_SECRET is not configured");
  }
  return secret;
}

export function generatePortalToken(docId: string, action: "view" | "sign" | "pdf"): string {
  const expires = Date.now() + TTL_HOURS * 60 * 60 * 1000;
  const payload = `${docId}:${action}:${expires}`;
  const sig = crypto.createHmac("sha256", getPortalSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyPortalToken(
  token: string,
  docId: string,
  action: "view" | "sign" | "pdf"
): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 4) return false;

    const [id, act, expires, sig] = parts;
    if (id !== docId || act !== action) return false;

    const expiresAt = Number.parseInt(expires, 10);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

    const payload = `${id}:${act}:${expires}`;
    const expected = crypto.createHmac("sha256", getPortalSecret()).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildPortalAccess(
  kind: "invoice" | "contract",
  docId: string,
  baseUrl: string
) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const viewToken = generatePortalToken(docId, "view");
  const signToken = generatePortalToken(docId, "sign");
  const pdfToken = generatePortalToken(docId, "pdf");

  const portalPath = kind === "invoice" ? `/portal/invoice/${docId}` : `/portal/contract/${docId}`;

  return {
    portalLink: `${cleanBase}${portalPath}?token=${viewToken}`,
    portalTokens: {
      view: viewToken,
      sign: signToken,
      pdf: pdfToken
    }
  };
}

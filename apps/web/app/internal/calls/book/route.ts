import { NextRequest, NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 1800;
const MAX_PROXY_TIME_MS = 5000;
const ENDPOINT_PATHS = ["/api/calls/book", "/calls/book"] as const;

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function sanitizeSingleLine(value: string, max = 120): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizePhone(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/\+/g, "")}`.slice(0, 20);
  }
  return cleaned.replace(/\+/g, "").slice(0, 20);
}

function buildFallbackEmailFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits) return `call-${digits}@zeroops.in`;
  return `call-${Date.now()}@zeroops.in`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 7;
}

function cleanApiBase(value: unknown): string {
  return asString(value).replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function getApiCandidates(): string[] {
  const configured = [
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_BASE_URL
  ]
    .map(cleanApiBase)
    .filter(Boolean);

  const fallback = [
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://zero-api-m0an.onrender.com"
  ];

  return Array.from(new Set([...configured, ...fallback]));
}

function isWrappedBodyValidationError(payload: UnknownRecord): boolean {
  if (asString(payload.message) !== "Validation failed") return false;

  const errors = toRecord(payload.errors);
  const fieldErrors = toRecord(errors.fieldErrors);
  const bodyErrors = fieldErrors.body;

  if (!Array.isArray(bodyErrors)) return false;
  return bodyErrors.some((entry) => asString(entry) === "Required");
}

async function postToEndpoint(baseUrl: string, path: string, payload: UnknownRecord): Promise<Response> {
  const direct = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (direct.status !== 400) {
    return direct;
  }

  let parsed: UnknownRecord = {};
  try {
    parsed = (await direct.clone().json()) as UnknownRecord;
  } catch {
    parsed = {};
  }

  if (!isWrappedBodyValidationError(parsed)) {
    return direct;
  }

  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

async function saveFallbackCall(payload: UnknownRecord): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(process.cwd(), "fallback-call-bookings.json");

    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }

    existing.push({
      ...payload,
      timestamp: new Date().toISOString(),
      source: "internal-call-book-fallback"
    });

    await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");
  } catch (error) {
    console.error("Unable to save fallback call booking:", error);
  }
}

export async function POST(req: NextRequest) {
  const body = toRecord(await req.json().catch(() => ({})));
  const sanitizedPhone = sanitizePhone(asString(body.phone));
  const sanitizedEmail = sanitizeEmail(asString(body.email));
  const normalizedEmail = isValidEmail(sanitizedEmail)
    ? sanitizedEmail
    : buildFallbackEmailFromPhone(sanitizedPhone);

  const normalized: UnknownRecord = {
    name: sanitizeSingleLine(asString(body.name), 80),
    email: normalizedEmail,
    phone: sanitizedPhone,
    timeSlot: asString(body.timeSlot)
  };

  if (asString(normalized.name).length < 2) {
    return NextResponse.json({ message: "Name must be at least 2 characters." }, { status: 422 });
  }
  if (!isValidPhone(asString(normalized.phone))) {
    return NextResponse.json({ message: "Please enter a valid mobile number." }, { status: 422 });
  }
  if (!asString(normalized.timeSlot)) {
    return NextResponse.json({ message: "Please select a timeslot." }, { status: 422 });
  }

  const parsedSlot = new Date(asString(normalized.timeSlot));
  if (Number.isNaN(parsedSlot.getTime())) {
    return NextResponse.json({ message: "Invalid timeslot selected." }, { status: 422 });
  }

  const candidates = getApiCandidates();
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    if (Date.now() - startedAt > MAX_PROXY_TIME_MS) break;

    for (const path of ENDPOINT_PATHS) {
      if (Date.now() - startedAt > MAX_PROXY_TIME_MS) break;

      try {
        const response = await postToEndpoint(baseUrl, path, normalized);

        if (response.status === 404) continue;

        const payload = (await response.json().catch(() => ({}))) as UnknownRecord;
        if (!response.ok) {
          return NextResponse.json(
            {
              message: asString(payload.message) || asString(payload.error) || "Unable to book call slot."
            },
            { status: response.status }
          );
        }

        return NextResponse.json(payload, { status: response.status });
      } catch (error) {
        lastError = error;
      }
    }
  }

  console.error("Call booking proxy fallback mode:", lastError);
  await saveFallbackCall(normalized);

  return NextResponse.json(
    {
      success: true,
      fallback: true,
      message: "Call request received. Our team will confirm your slot shortly."
    },
    { status: 201 }
  );
}

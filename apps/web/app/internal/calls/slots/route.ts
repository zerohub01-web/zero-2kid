import { NextRequest, NextResponse } from "next/server";

const SLOT_HOURS = [10, 11, 12, 14, 15, 16, 17, 18] as const;
const IST_OFFSET_MINUTES = 330;
const REQUEST_TIMEOUT_MS = 1500;
const MAX_PROXY_TIME_MS = 5000;

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function cleanApiBase(value: unknown): string {
  return asString(value).replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function getApiCandidates(): string[] {
  const configured = [
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_BASE_URL,
    process.env.API_URL
  ]
    .map(cleanApiBase)
    .filter(Boolean);

  const fallback = [
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:3001",
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:4000",
    "https://zero-api-m0an.onrender.com"
  ];

  return Array.from(new Set([...configured, ...fallback]));
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayIsoDateInIst(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function buildIstIso(date: string, hour24: number): string {
  const [year, month, day] = date.split("-").map((item) => Number(item));
  if (!year || !month || !day) return new Date().toISOString();

  const utcMillis = Date.UTC(year, month - 1, day, hour24, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis).toISOString();
}

function formatIstLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Invalid Slot";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  }).format(parsed);
}

function buildFallbackSlots(date: string) {
  const now = Date.now();

  return SLOT_HOURS.map((hour) => {
    const timeSlot = buildIstIso(date, hour);
    return {
      timeSlot,
      label: formatIstLabel(timeSlot),
      available: new Date(timeSlot).getTime() > now
    };
  });
}

function normalizeSlots(rawSlots: unknown, date: string) {
  if (!Array.isArray(rawSlots)) return buildFallbackSlots(date);

  const now = Date.now();
  const normalized = rawSlots
    .map((item) => {
      const record = toRecord(item);
      const timeSlot = asString(record.timeSlot);
      if (!timeSlot) return null;

      const parsed = new Date(timeSlot);
      if (Number.isNaN(parsed.getTime())) return null;

      const availableFromApi = typeof record.available === "boolean" ? record.available : true;
      return {
        timeSlot,
        label: formatIstLabel(timeSlot),
        available: availableFromApi && parsed.getTime() > now
      };
    })
    .filter((item): item is { timeSlot: string; label: string; available: boolean } => item !== null);

  return normalized.length > 0 ? normalized : buildFallbackSlots(date);
}

async function trySlotsEndpoint(baseUrl: string, path: string, date: string): Promise<Response> {
  return fetch(`${baseUrl}${path}?date=${encodeURIComponent(date)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

export async function GET(req: NextRequest) {
  const dateParam = asString(req.nextUrl.searchParams.get("date"));
  const date = isValidDate(dateParam) ? dateParam : getTodayIsoDateInIst();
  const candidates = getApiCandidates();
  const paths = ["/api/calls/slots", "/calls/slots"] as const;

  const startedAt = Date.now();
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    if (Date.now() - startedAt > MAX_PROXY_TIME_MS) break;

    for (const path of paths) {
      if (Date.now() - startedAt > MAX_PROXY_TIME_MS) break;

      try {
        const response = await trySlotsEndpoint(baseUrl, path, date);

        if (response.status === 404) continue;

        const payload = (await response.json().catch(() => ({}))) as UnknownRecord;

        if (!response.ok) {
          if (response.status === 400) {
            return NextResponse.json(
              { message: asString(payload.message) || "Invalid date." },
              { status: 400 }
            );
          }

          lastError = `Upstream ${baseUrl}${path} returned ${response.status}`;
          continue;
        }

        return NextResponse.json(
          {
            date,
            slots: normalizeSlots(payload.slots, date),
            fallback: false
          },
          { status: 200 }
        );
      } catch (error) {
        lastError = error;
      }
    }
  }

  console.error("Call slots proxy fallback mode:", lastError);
  return NextResponse.json(
    {
      date,
      slots: buildFallbackSlots(date),
      fallback: true,
      message: "Live availability is temporarily unavailable. Showing standard slots."
    },
    { status: 200 }
  );
}

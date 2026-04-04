type UnknownRecord = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 12000;
const MAX_PROXY_TIME_MS = 20000;
const ENDPOINT_PATHS = ["/api/bookings", "/bookings", "/api/leads", "/leads"] as const;

const API_CANDIDATES = [
  process.env.INTERNAL_API_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_BASE_URL,
  process.env.API_URL,
  "http://localhost:3001",
  "http://localhost:4000",
  "http://localhost:8000",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4000"
].filter(Boolean) as string[];

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function cleanApiBase(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function getApiCandidates(): string[] {
  return Array.from(
    new Set(
      API_CANDIDATES.map((value) => cleanApiBase(String(value))).filter(Boolean)
    )
  );
}

function getRuntimeApiCandidates(req: Request): string[] {
  const candidates = getApiCandidates();

  try {
    const currentOrigin = new URL(req.url).origin.replace(/\/+$/, "");
    if (currentOrigin) {
      candidates.unshift(currentOrigin);
    }
  } catch {
    // ignore malformed request URLs
  }

  return Array.from(new Set(candidates));
}

function buildApiPayload(input: unknown): UnknownRecord {
  const body = toRecord(input);
  const source = toRecord(body.body ?? body);

  const name = asString(source.name ?? source.fullName);
  const email = asString(source.email ?? source.emailAddress);
  const phone = asString(source.phone ?? source.phoneNumber);
  const businessType = asString(source.businessType ?? source.business_type ?? source.company ?? source.companyName);
  const service = asString(source.service ?? source.serviceType);
  const budget = asString(source.budget);
  const message = asString(source.message ?? source.notes ?? source.projectDetails);
  const date = asString(source.date);
  const website = asString(source.website);
  const recaptchaToken = asString(source.recaptchaToken);
  const recaptchaAction = asString(source.recaptchaAction);

  const payload: UnknownRecord = {
    name,
    email,
    phone,
    businessType,
    service,
    message
  };

  if (budget) payload.budget = budget;
  if (date) payload.date = date;
  if (website) payload.website = website;
  if (recaptchaToken) payload.recaptchaToken = recaptchaToken;
  if (recaptchaAction) payload.recaptchaAction = recaptchaAction;

  return payload;
}

function getMissingRequiredFields(payload: UnknownRecord): string[] {
  const required = ["name", "email", "phone", "businessType", "service", "message"] as const;
  return required.filter((key) => !asString(payload[key]));
}

function needsWrappedRetry(payload: UnknownRecord): boolean {
  if (asString(payload.message) !== "Validation failed") return false;

  const errors = toRecord(payload.errors);
  const fieldErrors = toRecord(errors.fieldErrors);
  const bodyErrors = fieldErrors.body;

  if (!Array.isArray(bodyErrors)) return false;
  return bodyErrors.some((entry) => asString(entry).toLowerCase() === "required");
}

async function postBooking(
  baseUrl: string,
  path: string,
  apiPayload: UnknownRecord,
  forwardedFor: string
): Promise<Response> {
  console.log("📦 Sending to API:", JSON.stringify(apiPayload));
  console.log("🎯 API endpoint:", `${baseUrl}${path}`);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (forwardedFor) {
    headers["X-Forwarded-For"] = forwardedFor;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(apiPayload),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (response.status !== 400) {
    return response;
  }

  let parsed: UnknownRecord = {};
  try {
    parsed = (await response.clone().json()) as UnknownRecord;
  } catch {
    parsed = {};
  }

  if (!needsWrappedRetry(parsed)) {
    return response;
  }

  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: apiPayload }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

async function parseUpstreamPayload(response: Response): Promise<UnknownRecord> {
  const text = await response.text();
  if (!text.trim()) {
    return response.ok
      ? { success: true, message: "Booking received." }
      : { error: "Booking service returned an empty response." };
  }

  try {
    return JSON.parse(text) as UnknownRecord;
  } catch {
    return response.ok
      ? { success: true, message: "Booking received." }
      : { error: text.slice(0, 240) };
  }
}

async function saveFallbackLead(payload: UnknownRecord): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const fallbackPath = path.join(process.cwd(), "fallback-leads.json");

    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(fallbackPath, "utf-8");
      const parsed = JSON.parse(raw);
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }

    existing.push({
      ...payload,
      timestamp: new Date().toISOString(),
      source: "bookings-proxy-fallback"
    });

    await fs.writeFile(fallbackPath, JSON.stringify(existing, null, 2), "utf-8");
  } catch (error) {
    console.error("Could not save fallback lead:", error);
  }
}

export async function POST(req: Request) {
  let apiPayload: UnknownRecord = {
    name: "",
    email: "",
    phone: "",
    businessType: "",
    service: "",
    message: ""
  };

  try {
    const body = await req.json().catch(() => ({}));
    apiPayload = buildApiPayload(body);
    const forwardedFor = (req.headers.get("x-forwarded-for") ?? "").trim();
    const hasCaptchaToken = Boolean(asString(apiPayload.recaptchaToken));
    console.log(`📨 Booking submission — captcha: ${hasCaptchaToken ? "present" : "missing"}`);

    const missing = getMissingRequiredFields(apiPayload);
    if (missing.length > 0) {
      return Response.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 422 }
      );
    }

    const candidates = getRuntimeApiCandidates(req);
    const startedAt = Date.now();
    let upstream: Response | null = null;

    for (const baseUrl of candidates) {
      if (Date.now() - startedAt > MAX_PROXY_TIME_MS) break;

      for (const path of ENDPOINT_PATHS) {
        if (Date.now() - startedAt > MAX_PROXY_TIME_MS) break;

        try {
          const res = await postBooking(baseUrl, path, apiPayload, forwardedFor);
          if (res.status === 404) continue;
          upstream = res;
          break;
        } catch (error) {
          console.error(`Booking proxy error at ${baseUrl}${path}:`, error);
        }
      }

      if (upstream) break;
    }

    if (!upstream) {
      await saveFallbackLead(apiPayload);
      console.warn(
        "⚠️  FALLBACK USED — lead saved locally, NOT in database.",
        "Fix INTERNAL_API_URL in .env to point to real API.",
        "Current candidates tried:",
        candidates
      );

      return Response.json(
        {
          success: false,
          fallback: true,
          error: "Lead service is temporarily unavailable. Your request was saved locally but did not reach the admin inbox.",
          warning: "Saved locally - API unreachable"
        },
        { status: 503 }
      );
    }

    const data = await parseUpstreamPayload(upstream);

    if (data.fallback === true) {
      console.warn(
        "⚠️  FALLBACK USED — lead saved locally, NOT in database.",
        "Fix INTERNAL_API_URL in .env to point to real API.",
        "Current candidates tried:",
        candidates
      );
    }

    return Response.json(data, { status: upstream.status });
  } catch (error) {
    console.error("Bookings proxy fatal error:", error);
    await saveFallbackLead(apiPayload);

    return Response.json(
      {
        success: false,
        fallback: true,
        error: "Lead service is temporarily unavailable. Your request was saved locally but did not reach the admin inbox.",
        warning: "Saved locally - API unreachable"
      },
      { status: 503 }
    );
  }
}

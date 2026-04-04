import { NextRequest, NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeGoogleAuthPayload(rawInput: unknown) {
  const raw = toRecord(rawInput);
  const source = toRecord(raw.body ?? raw);

  const credential = asString(source.credential ?? source.token);
  const clientId = asString(source.clientId ?? source.googleClientId);

  return { credential, clientId };
}

function getApiCandidates(): string[] {
  const configured = [
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_BASE_URL
  ]
    .map((value) => asString(value))
    .map((value) => value.replace(/\/+$/, ""))
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

async function tryGoogleAuth(
  apiBase: string,
  payload: { credential: string; clientId: string }
): Promise<Response> {
  let response = await fetch(`${apiBase}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (response.status === 400) {
    let shouldRetryWrapped = false;
    try {
      const data = (await response.clone().json()) as {
        message?: string;
        errors?: { fieldErrors?: { body?: string[] } };
      };

      shouldRetryWrapped =
        data?.message === "Validation failed" &&
        Array.isArray(data?.errors?.fieldErrors?.body) &&
        data.errors.fieldErrors.body.includes("Required");
    } catch {
      shouldRetryWrapped = false;
    }

    if (shouldRetryWrapped) {
      response = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: payload }),
        cache: "no-store"
      });
    }
  }

  return response;
}

async function parseResponsePayload(response: Response): Promise<UnknownRecord> {
  const text = await response.text();
  if (!text || !text.trim()) {
    return response.ok
      ? { message: "Authentication completed." }
      : { message: "Authentication server returned an empty response." };
  }

  try {
    return JSON.parse(text) as UnknownRecord;
  } catch {
    return response.ok
      ? { message: "Authentication completed." }
      : { message: `Authentication server error: ${text.slice(0, 220)}` };
  }
}

function applyBackendCookies(source: Response, target: NextResponse) {
  try {
    const setCookieList =
      typeof (source.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie ===
      "function"
        ? (source.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : [];

    if (Array.isArray(setCookieList) && setCookieList.length > 0) {
      for (const cookie of setCookieList) {
        target.headers.append("set-cookie", cookie);
      }
      return;
    }

    const setCookie = source.headers.get("set-cookie");
    if (setCookie) target.headers.set("set-cookie", setCookie);
  } catch (cookieError) {
    console.error("Failed to forward auth cookie:", cookieError);
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await req.json().catch(() => ({}));
    const normalizedPayload = normalizeGoogleAuthPayload(input);

    if (!normalizedPayload.credential) {
      return NextResponse.json(
        { success: false, error: "Google credential is required" },
        { status: 400 }
      );
    }

    const candidates = getApiCandidates();
    let backendResponse: Response | null = null;
    let lastError: unknown = null;

    for (const baseUrl of candidates) {
      try {
        const response = await tryGoogleAuth(baseUrl, normalizedPayload);

        if (response.status >= 500) {
          lastError = `Server ${baseUrl} returned ${response.status}`;
          continue;
        }

        backendResponse = response;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!backendResponse) {
      console.error("Google auth proxy upstream unavailable:", lastError);
      return NextResponse.json(
        { success: false, error: "Auth service temporarily unavailable" },
        { status: 503 }
      );
    }

    const payload = await parseResponsePayload(backendResponse);
    const response = NextResponse.json(payload, { status: backendResponse.status });
    applyBackendCookies(backendResponse, response);
    return response;
  } catch (error) {
    console.error("Internal Google auth route error:", error);
    return NextResponse.json(
      { success: false, error: "Auth service temporarily unavailable" },
      { status: 503 }
    );
  }
}


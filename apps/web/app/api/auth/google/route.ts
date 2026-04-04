import { NextRequest, NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
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

async function parsePayload(response: Response): Promise<UnknownRecord> {
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
      for (const cookie of setCookieList) target.headers.append("set-cookie", cookie);
      return;
    }

    const setCookie = source.headers.get("set-cookie");
    if (setCookie) target.headers.set("set-cookie", setCookie);
  } catch (error) {
    console.error("Failed to forward auth cookie:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as UnknownRecord;
    const credential = asString(body.credential);

    if (!credential) {
      return NextResponse.json({ message: "Google credential is required" }, { status: 400 });
    }

    let backendResponse: Response | null = null;
    let lastError: unknown = null;

    for (const baseUrl of getApiCandidates()) {
      try {
        const response = await fetch(`${baseUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
          cache: "no-store"
        });

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
      console.error("Google auth route upstream unavailable:", lastError);
      return NextResponse.json(
        { message: "Authentication service is unreachable. Please try again." },
        { status: 503 }
      );
    }

    const payload = await parsePayload(backendResponse);
    const response = NextResponse.json(payload, { status: backendResponse.status });
    applyBackendCookies(backendResponse, response);
    return response;
  } catch (error) {
    console.error("Google auth route error:", error);
    return NextResponse.json(
      { message: "An error occurred during Google authentication." },
      { status: 500 }
    );
  }
}


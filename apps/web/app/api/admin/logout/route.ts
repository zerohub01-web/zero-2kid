import { NextResponse } from "next/server";

const CANDIDATES = [
  process.env.INTERNAL_API_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_BASE_URL,
  process.env.API_URL,
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:3001",
  "http://127.0.0.1:3001"
].filter(Boolean) as string[];

function clean(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function uniqueCandidates(): string[] {
  return Array.from(new Set(CANDIDATES.map((v) => clean(String(v))).filter(Boolean)));
}

function applyCookies(source: Response, target: NextResponse) {
  const setCookie = source.headers.get("set-cookie");
  if (setCookie) {
    target.headers.set("set-cookie", setCookie);
  }
}

export async function POST() {
  const candidates = uniqueCandidates();

  for (const base of candidates) {
    try {
      const upstream = await fetch(`${base}/api/admin/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });

      const payload = await upstream.json().catch(() => ({ ok: upstream.ok }));
      const response = NextResponse.json(payload, { status: upstream.status });
      applyCookies(upstream, response);
      return response;
    } catch {
      continue;
    }
  }

  return NextResponse.json({ ok: true, fallback: true }, { status: 200 });
}

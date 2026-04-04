import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";
const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, "");
const API_BASE = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, "")
  : isProd
    ? "https://zero-api-m0an.onrender.com"
    : "http://localhost:4000";
const TIMEOUT_MS = 8000;

async function safeFetch(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.projects ?? []);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function getWorks() {
  // Public works endpoint is enough here. Admin/project endpoints may be auth-protected.
  return safeFetch(`${API_BASE}/api/work`);
}

export default async function WorksPage() {
  const items = await getWorks();

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" /><div className="orb orb-b" />
      <SiteHeader />
      <section className="relative z-10 max-w-6xl mx-auto mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Works</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Case results from real delivery.</h1>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {items.map((w: any) => (
            <article key={w._id || w.id || w.title} className="soft-card relative overflow-hidden group">
              {w.coverImage && (
                <div className="h-40 w-full bg-black/5 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.coverImage} alt={w.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)] font-bold">{w.type}</p>
                <h2 className="text-2xl font-display text-[var(--ink)] mt-2">{w.title}</h2>
                <p className="text-sm text-[var(--accent)] mt-3">{w.result}</p>
              </div>
            </article>
          ))}
          {items.length === 0 && (
            <p className="text-[var(--muted)] mt-4">Case studies will be populated soon.</p>
          )}
        </div>
      </section>
      <div className="mt-10"><SiteFooter /></div>
    </main>
  );
}


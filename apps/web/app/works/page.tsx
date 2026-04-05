import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

export const dynamic = "force-dynamic";

interface WorkItem {
  _id?: string;
  id?: string;
  title: string;
  type?: string;
  result?: string;
  coverImage?: string;
}

interface ReviewCard {
  id?: string;
  clientName: string;
  rating: number;
  reviewText: string;
  testimonial?: string;
}

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
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getWorks(): Promise<WorkItem[]> {
  const data = await safeFetch(`${API_BASE}/api/work`);
  return Array.isArray(data) ? data : (data?.projects ?? []);
}

async function getApprovedReviews(): Promise<ReviewCard[]> {
  try {
    const res = await fetch(`${API_BASE}/api/reviews/public?limit=12`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.reviews) ? data.reviews : [];
  } catch {
    return [];
  }
}

function truncateReview(text: string, limit: number) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

export default async function WorksPage() {
  const [items, reviews] = await Promise.all([getWorks(), getApprovedReviews()]);

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <SiteHeader />

      <section className="relative z-10 max-w-6xl mx-auto mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Works</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Case results from real delivery.</h1>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {items.map((work) => (
            <article key={work._id || work.id || work.title} className="soft-card relative overflow-hidden group">
              {work.coverImage ? (
                <div className="h-40 w-full bg-black/5 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={work.coverImage} alt={work.title} className="w-full h-full object-cover" />
                </div>
              ) : null}

              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)] font-bold">{work.type}</p>
                <h2 className="text-2xl font-display text-[var(--ink)] mt-2">{work.title}</h2>
                <p className="text-sm text-[var(--accent)] mt-3">{work.result}</p>
              </div>
            </article>
          ))}

          {items.length === 0 ? (
            <p className="text-[var(--muted)] mt-4">Case studies will be populated soon.</p>
          ) : null}
        </div>

        {reviews.length > 0 ? (
          <section className="soft-card mt-10 p-6">
            <h3 className="text-2xl font-display text-[var(--ink)]">What Clients Say</h3>
            <div className="grid gap-4 md:grid-cols-3 mt-5">
              {reviews.slice(0, 3).map((review) => (
                <article key={review.id || review.clientName} className="rounded-2xl border border-black/10 bg-white/70 p-5">
                  <span className="text-amber-500 text-sm tracking-[0.18em]">
                    {"\u2605".repeat(Math.max(0, Math.min(5, Number(review.rating || 0))))}
                  </span>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    "{truncateReview(review.reviewText || review.testimonial || "", 100)}"
                  </p>
                  <span className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                    {`- ${review.clientName}`}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  );
}

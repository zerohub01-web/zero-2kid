import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

interface ReviewCard {
  id?: string;
  clientName: string;
  clientBusiness?: string;
  serviceUsed?: string;
  rating: number;
  reviewText: string;
  testimonial?: string;
}

const fallbackItems: ReviewCard[] = [
  {
    id: "fallback-1",
    clientName: "Arun Nair",
    clientBusiness: "Logistics Company",
    rating: 5,
    reviewText: "ZERO automated our lead follow-up and saved our ops team hours every week."
  },
  {
    id: "fallback-2",
    clientName: "Megha Patel",
    clientBusiness: "Healthcare Clinic",
    rating: 5,
    reviewText: "We moved from manual chaos to a clear booking and analytics workflow in weeks."
  },
  {
    id: "fallback-3",
    clientName: "Rohit Sharma",
    clientBusiness: "Retail Brand",
    rating: 5,
    reviewText: "The dashboard visibility and automation stack helped us scale without adding headcount."
  }
];

const isProd = process.env.NODE_ENV === "production";
const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, "");
const API_BASE = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, "")
  : isProd
    ? "https://zero-api-m0an.onrender.com"
    : "http://localhost:4000";

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

function renderStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
  return `${"\u2605".repeat(safeRating)}${"\u2606".repeat(5 - safeRating)}`;
}

export default async function TestimonialsPage() {
  const reviews = await getApprovedReviews();
  const items = reviews.length > 0 ? reviews : fallbackItems;

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <SiteHeader />

      <section className="relative z-10 max-w-6xl mx-auto mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Testimonials</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Trusted by Growing Businesses</h1>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {items.map((review) => (
            <article key={review.id || review.clientName} className="soft-card p-6 flex flex-col gap-4">
              <div className="text-amber-500 text-lg tracking-[0.18em]">{renderStars(review.rating)}</div>
              <p className="text-sm text-[var(--muted)] leading-7">"{review.reviewText || review.testimonial || ""}"</p>
              <div>
                <p className="text-[var(--ink)] font-semibold">{review.clientName}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)] mt-1">
                  {[review.clientBusiness, review.serviceUsed].filter(Boolean).join(" | ")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  );
}

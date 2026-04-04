import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

const tiers = [
  {
    name: "Basic",
    price: "INR 14,999 - 24,999",
    note: "Productized fast-delivery setup for businesses that need a clean launch quickly.",
    features: [
      "Up to 5 static pages (Home, About, Services, Gallery, Contact)",
      "Mobile-responsive, speed-optimized architecture",
      "Direct WhatsApp CTA + basic lead capture form",
      "One round of structural revisions",
      "Client must provide all final text and media before development"
    ],
    cta: "Start Storefront"
  },
  {
    name: "Plus",
    price: "INR 39,999 - 59,999",
    note: "For teams replacing manual follow-up and intake work with automation pipelines.",
    features: [
      "Everything in Basic + up to 10 pages and CMS",
      "Automated intake flows to Google Sheets/CRM",
      "Instant lead response via email or WhatsApp/SMS workflow",
      "Custom workflow modules (e.g., admissions or application tracking)",
      "On-page SEO setup + Google Analytics dashboard"
    ],
    cta: "Choose Automation",
    featured: true
  },
  {
    name: "Digital Marketing Growth Ops",
    price: "INR 9,999 - INR 49,999 / month",
    note: "For businesses ready to scale traffic, lead quality, and conversion with a managed monthly growth engine.",
    features: [
      "SEO + local rank execution",
      "Google Search + Meta ads management",
      "Social media content operations",
      "Monthly reporting and strategy call",
      "Recommended ad spend: INR 9,999 - INR 199,999 / month"
    ],
    cta: "Start Marketing Ops"
  },
  {
    name: "Digital Fortress & AI",
    price: "INR 89,999 - 1,49,999+",
    note: "Operational infrastructure for companies that need custom systems, AI, and hardened security.",
    features: [
      "Custom backend architecture (Node.js or Python)",
      "Business-trained AI assistant for customer support",
      "Advanced internal dashboards and predictive logic",
      "Security hardening: WAF, rate limiting, encrypted data handling",
      "Priority architecture planning for scale"
    ],
    cta: "Book Strategy Call"
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <SiteHeader />

      <section className="relative z-10 max-w-6xl mx-auto mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Pricing</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Productized tiers with clear boundaries.</h1>
        <p className="text-[var(--muted)] mt-4 max-w-3xl">
          These plans are engineered for speed and profitability: strong perceived value, tight scope control, and fast deployment cycles.
        </p>

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`soft-card p-6 ${tier.featured ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{tier.name}</p>
              <p className="text-4xl font-display text-[var(--ink)] mt-3">{tier.price}</p>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{tier.note}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--ink)]">
                {tier.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <a href="/book" className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-[var(--ink)] text-white py-2.5 text-sm font-semibold">
                {tier.cta}
              </a>
            </article>
          ))}
        </section>
      </section>

      <div className="mt-10"><SiteFooter /></div>
    </main>
  );
}



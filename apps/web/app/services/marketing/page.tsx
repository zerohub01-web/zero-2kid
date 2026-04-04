import Link from "next/link";
import { BarChart3, ShieldCheck, Wrench } from "lucide-react";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

const monthlyServices = [
  {
    id: "01",
    title: "Search Engine Dominance",
    subtitle: "SEO & Local Rank",
    items: [
      "Keyword Optimization: Continuous updates to rank for exact terms your customers search.",
      "Google Business Profile Management: Dominate local map listings in your city.",
      "Technical SEO Audits: Monthly backend checks keeping your site fast and error-free."
    ]
  },
  {
    id: "02",
    title: "Precision Paid Advertising",
    subtitle: "PPC",
    items: [
      "Google Search Ads: Capture high-intent customers actively searching for your services.",
      "Meta Ads (Instagram & Facebook): Targeted visual campaigns to build awareness and drive clicks.",
      "Retargeting Campaigns: Automated ads that bring back visitors who left without converting."
    ]
  },
  {
    id: "03",
    title: "Social Media Presence",
    subtitle: "Content & Authority",
    items: [
      "Content Strategy: 3 brand-aligned posts per week across your two main platforms.",
      "Asset Creation: We design graphics and write copy so your brand looks active and authoritative."
    ]
  },
  {
    id: "04",
    title: "Analytics & Reporting",
    subtitle: "Full Transparency",
    items: [
      "Live Dashboard: Real-time view of exactly where every rupee is going.",
      "Monthly Strategy Call: Full breakdown of clicks, leads, and customers generated that month."
    ]
  },
  {
    id: "05",
    title: "Personal Brand Building",
    subtitle: "Authority Positioning",
    items: [
      "Founder Positioning: Build a strong personal brand voice aligned with your business goals.",
      "Trust Content Framework: Create content pillars that increase trust, recall, and inbound leads.",
      "Visibility Roadmap: Weekly execution plan to grow presence across priority channels."
    ]
  },
  {
    id: "06",
    title: "Reels & Short Video Strategy",
    subtitle: "Short-Form Growth",
    items: [
      "Reel Strategy: Hook-first short video plans designed for reach and retention.",
      "Content Scripting: Script ideas and shot flow for consistent, brand-aligned production.",
      "Performance Optimization: Improve watch time, saves, and lead-driving CTAs."
    ]
  },
  {
    id: "07",
    title: "Social Media Management",
    subtitle: "Daily Consistency",
    items: [
      "Monthly Content Calendar: Planned publishing across your active social channels.",
      "Posting & Scheduling: Consistent execution so your brand stays active and visible.",
      "Community Handling: Basic comment and DM response workflows for faster engagement."
    ]
  },
  {
    id: "08",
    title: "AI-Powered Marketing",
    subtitle: "Automation + Intelligence",
    items: [
      "AI Content Assist: Generate faster campaign ideas, copy angles, and creative variants.",
      "Audience Insight Loops: Use AI-assisted analysis to refine messaging and targeting.",
      "Smart Optimization: Identify winning creatives and reduce ad waste faster."
    ]
  },
  {
    id: "09",
    title: "Email Marketing Automation",
    subtitle: "Lifecycle Campaigns",
    items: [
      "Automated Email Flows: Welcome, nurture, and follow-up sequences for lead conversion.",
      "Broadcast Campaigns: Promotional and educational email campaigns with clear CTAs.",
      "Performance Tracking: Monitor opens, clicks, and conversion outcomes each cycle."
    ]
  },
  {
    id: "10",
    title: "GEO & AEO",
    subtitle: "Search Beyond SEO",
    items: [
      "GEO (Generative Engine Optimization): Structure content for AI search and answer engines.",
      "AEO (Answer Engine Optimization): Build answer-first pages to capture question-driven traffic.",
      "Entity & Schema Signals: Improve discoverability in modern AI-assisted search journeys."
    ]
  }
];

const terms = [
  {
    icon: ShieldCheck,
    title: "No Lock-In Contracts",
    description:
      "We work month-to-month. We earn your business every 30 days by delivering real results."
  },
  {
    icon: Wrench,
    title: "Baseline Audit First",
    description:
      "Before spending a rupee on ads, we stress-test your website. If it can't convert traffic, we fix it first."
  },
  {
    icon: BarChart3,
    title: "Full Transparency Always",
    description:
      "Live dashboards, real numbers, zero fluff. You always know what's working and what isn't."
  }
];

export default function DigitalMarketingServicePage() {
  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pt-8 md:pt-12 pb-12 md:pb-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-[var(--muted)] font-semibold">
          Done-For-You Digital Marketing System
        </p>
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-display leading-[0.95] text-[var(--ink)]">
          The Growth Ops Package
        </h1>
        <p className="mt-5 max-w-4xl text-sm sm:text-base md:text-lg text-[var(--muted)] leading-relaxed">
          The complete, done-for-you digital marketing engine to scale your traffic, capture leads, and
          multiply your revenue. If your business already has a solid digital foundation, it is time to turn
          the traffic on. We do not just run basic ads - we deploy a full-scale digital marketing system designed to
          put your brand in front of ready-to-buy customers.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/book"
            className="btn-primary inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold"
          >
            Book Free Audit
          </Link>
          <a
            href="https://wa.me/918590464379"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
          >
            WhatsApp Us
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            ["10 Services", "Included Every Month"],
            ["INR 9,999 - INR 49,999", "Agency Fee / Month"],
            ["INR 9,999 - INR 199,999", "Recommended Ad Budget"],
            ["0", "Lock-In Contracts"]
          ].map(([value, label]) => (
            <div key={value} className="soft-card px-4 py-4">
              <p className="text-3xl font-display text-[var(--ink)]">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
          What You Get Every Month
        </p>
        <h2 className="mt-3 text-3xl md:text-5xl font-display text-[var(--ink)]">What You Get Every Month</h2>
        <p className="mt-3 text-[var(--muted)]">A full-stack digital marketing system, not just ads.</p>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {monthlyServices.map((service) => (
            <article key={service.id} className="soft-card p-6 md:p-7">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)] font-semibold">{service.id}</p>
              <h3 className="mt-2 text-2xl font-display text-[var(--ink)]">{service.title}</h3>
              <p className="mt-1 text-sm uppercase tracking-[0.12em] text-[var(--muted)]">{service.subtitle}</p>
              <ul className="mt-5 space-y-2">
                {service.items.map((item) => (
                  <li key={item} className="text-sm text-[var(--muted)] leading-relaxed flex gap-2">
                    <span className="text-[var(--accent)]">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">Pricing</p>
        <h2 className="mt-3 text-3xl md:text-5xl font-display text-[var(--ink)]">Transparent Investment</h2>
        <p className="mt-3 text-[var(--muted)]">No hidden fees. No surprises. Just results.</p>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <article className="soft-card p-6 md:p-7 border-[var(--accent)]/50">
            <span className="inline-flex rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink)]">
              Our Fee
            </span>
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Agency Management Fee</p>
            <p className="mt-2 text-4xl font-display text-[var(--ink)]">INR 9,999 - INR 49,999 / month</p>
            <p className="mt-4 text-sm text-[var(--muted)] leading-relaxed">
              Covers all our labor: SEO work, social media posting, ad creation, and daily campaign
              management.
            </p>
          </article>

          <article className="soft-card p-6 md:p-7">
            <span className="inline-flex rounded-full border border-black/15 bg-white/65 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
              Goes to Google &amp; Meta
            </span>
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Paid Ad Budget</p>
            <p className="mt-2 text-4xl font-display text-[var(--ink)]">INR 9,999 - INR 199,999 / month</p>
            <p className="mt-4 text-sm text-[var(--muted)] leading-relaxed">
              Paid directly to Google and Meta to run your ads. You control this budget entirely.
            </p>
          </article>
        </div>

        <p className="mt-5 text-sm text-[var(--muted)]">
          Total recommended starting budget: INR 19,998 - INR 249,998/month for maximum results.
        </p>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">Terms</p>
        <h2 className="mt-3 text-3xl md:text-5xl font-display text-[var(--ink)]">How We Work</h2>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {terms.map((term) => {
            const Icon = term.icon;
            return (
              <article key={term.title} className="soft-card p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 text-xl font-display text-[var(--ink)]">{term.title}</h3>
                <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">{term.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-16 md:pb-20">
        <div className="soft-card p-6 md:p-8">
          <h2 className="text-3xl md:text-5xl font-display text-[var(--ink)]">Ready to Turn the Traffic On?</h2>
          <p className="mt-3 text-[var(--muted)]">
            Start with a free audit. We'll show you exactly what's holding your growth back.
          </p>

          <div className="mt-7 grid md:grid-cols-3 gap-3">
            <article className="rounded-xl border border-black/10 bg-white/75 p-4">
              <p className="text-sm text-[var(--muted)] mb-3">Book Free Audit</p>
              <Link
                href="/book"
                className="btn-primary inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold"
              >
                Book Free Audit
              </Link>
            </article>

            <article className="rounded-xl border border-black/10 bg-white/75 p-4">
              <p className="text-sm text-[var(--muted)] mb-3">WhatsApp Us</p>
              <a
                href="https://wa.me/918590464379"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                +91 85904 64379
              </a>
            </article>

            <article className="rounded-xl border border-black/10 bg-white/75 p-4">
              <p className="text-sm text-[var(--muted)] mb-3">Email Us</p>
              <a
                href="mailto:zerohub01@gmail.com"
                className="btn-secondary inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                zerohub01@gmail.com
              </a>
            </article>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

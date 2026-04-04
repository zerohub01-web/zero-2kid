import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

const coreServices = [
  {
    title: "Website + Brand Foundation",
    summary:
      "High-performance websites with clear business messaging, conversion-first structure, and a professional brand foundation."
  },
  {
    title: "Digital Marketing Growth Ops",
    summary:
      "Done-for-you SEO, paid ads, social media, and reporting designed to turn traffic into qualified leads."
  },
  {
    title: "Lead Capture + Follow-up Automation",
    summary:
      "Smart intake forms, CRM routing, email/WhatsApp automation, and lead status tracking without manual follow-up."
  },
  {
    title: "Workflow Portals + Dashboards",
    summary:
      "Custom client/admin dashboards for onboarding, approvals, project tracking, and conversion monitoring."
  },
  {
    title: "Hosting + Infrastructure",
    summary:
      "Managed deployment, uptime monitoring, SSL, backups, and operational reliability for production systems."
  },
  {
    title: "AI Assistant + Qualification Layer",
    summary:
      "AI chat and lead qualification workflows that capture intent and support your team with faster response cycles."
  },
  {
    title: "Security Hardening",
    summary:
      "Rate limiting, validation, secure auth, and vulnerability prevention standards for real business systems."
  }
];

const addOns = [
  "Digital marketing launch strategy + baseline audit",
  "Google Search Ads + Meta Ads campaign setup",
  "SEO + local rank acceleration sprint",
  "Conversion rate optimization sprint",
  "WhatsApp automation setup and templates",
  "AI chatbot deployment and tuning",
  "Database cleanup and performance tuning",
  "Legacy site migration + upgrade"
];

const comparisonRows = [
  ["Average Cost", "INR 49,999 - INR 149,999+", "From INR 14,999"],
  ["Delivery Time", "4 to 8 weeks", "Under 14 days for scoped builds"],
  ["Maintenance Burden", "High (manual server work)", "Low (automation-first architecture)"],
  ["Security Stack", "Basic plugins", "Production-grade auth, validation, and monitoring"],
  ["Scalability", "Paid migration cycles", "Modular architecture for growth"],
  ["Workflow Automation", "Mostly manual handoffs", "Automated intake and follow-up"],
  ["Visibility", "Limited reporting", "Dashboard-first performance visibility"]
];

const faqs = [
  {
    q: "What does ZERO do exactly?",
    a: "ZERO builds websites, digital marketing systems, and automation workflows that help businesses capture and convert more leads."
  },
  {
    q: "Do you provide digital marketing along with website work?",
    a: "Yes. We provide SEO, Google and Meta ads, social media support, and reporting as part of our Digital Marketing Growth Ops service."
  },
  {
    q: "How much does a project usually cost?",
    a: "Most projects start from INR 14,999. Cost depends on scope, integrations, and automation depth."
  },
  {
    q: "Can I start with one service and scale later?",
    a: "Yes. You can start with one focused package and then add automation, marketing, or dashboard modules as your business grows."
  },
  {
    q: "How quickly can you launch?",
    a: "Scoped launches are typically delivered in under 14 days. Larger systems are planned in milestones."
  },
  {
    q: "How do I start?",
    a: "Book a free audit from the booking page. We review your current setup, identify growth blockers, and recommend the right package."
  }
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <SiteHeader />

      <section className="relative z-10 max-w-6xl mx-auto mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Services</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3 leading-tight">
          Everything you need to build, automate, and grow.
        </h1>
        <p className="text-[var(--muted)] mt-4 max-w-3xl text-sm md:text-base leading-relaxed">
          ZERO combines website delivery, lead automation, digital marketing, and dashboard visibility in one
          simple operating model.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/book" className="btn-primary rounded-full px-5 py-2.5 text-sm">
            Book Free Audit
          </Link>
          <Link href="/services/marketing" className="btn-secondary rounded-full px-5 py-2.5 text-sm">
            View Digital Marketing Package
          </Link>
          <Link href="/book-call" className="btn-secondary rounded-full px-5 py-2.5 text-sm">
            Book Strategy Call
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {coreServices.map((item) => (
            <article key={item.title} className="soft-card p-6">
              <h2 className="text-2xl font-display text-[var(--ink)]">{item.title}</h2>
              <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{item.summary}</p>
            </article>
          ))}
        </div>

        <article className="soft-card p-6 mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Optional Add-Ons</p>
          <h2 className="text-3xl font-display text-[var(--ink)] mt-2">High-impact add-on services</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-[var(--muted)]">
            {addOns.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        </article>

        <article className="dark-card p-6 mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Featured Service</p>
          <h2 className="text-3xl font-display mt-2">Digital Marketing Growth Ops Package</h2>
          <p className="text-sm text-white/90 mt-3 max-w-3xl leading-relaxed">
            End-to-end SEO, ads, content, and analytics management for businesses ready to scale predictable
            lead flow.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/services/marketing"
              className="btn-secondary rounded-full px-5 py-2 text-sm bg-white text-[var(--ink)] border-white"
            >
              View Package
            </Link>
            <Link
              href="/book"
              className="btn-secondary rounded-full px-5 py-2 text-sm border-white/70 text-white hover:bg-white hover:text-[var(--ink)]"
            >
              Book Free Audit
            </Link>
          </div>
        </article>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto mt-10">
        <h2 className="text-3xl md:text-4xl font-display text-[var(--ink)]">ZERO vs Traditional Agencies</h2>
        <p className="text-[var(--muted)] text-sm mt-2 mb-6 leading-relaxed max-w-4xl">
          We focus on faster launches, cleaner systems, and measurable lead outcomes with less operational
          overhead.
        </p>
        <div className="overflow-x-auto rounded-xl border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--ink)] text-white">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Feature</th>
                <th className="text-left px-5 py-3 font-semibold">Traditional Agency</th>
                <th className="text-left px-5 py-3 font-semibold">ZERO System</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 bg-white/60">
              {comparisonRows.map(([feature, traditional, zeroops]) => (
                <tr key={feature} className="hover:bg-white/80 transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--ink)]">{feature}</td>
                  <td className="px-5 py-3 text-[var(--muted)]">{traditional}</td>
                  <td className="px-5 py-3 text-[var(--accent)] font-semibold">{zeroops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="zeroops-faq"
        className="relative z-10 max-w-6xl mx-auto mt-12"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.a
                }
              }))
            })
          }}
        />
        <h2 className="text-3xl md:text-4xl font-display text-[var(--ink)]">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-4">
          {faqs.map(({ q, a }) => (
            <div
              key={q}
              className="soft-card p-5"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <h3 className="font-display text-lg text-[var(--ink)]" itemProp="name">
                {q}
              </h3>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed" itemProp="text">
                  {a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  );
}

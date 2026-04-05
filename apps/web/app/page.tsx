"use client";

import dynamic from "next/dynamic";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { getFeaturedBlogPosts } from "../lib/blog";
import { ZeroLogo } from "../components/brand/ZeroLogo";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { BookingRequestForm } from "../components/booking/BookingRequestForm";
import { ErrorBoundary } from "../components/ErrorBoundary";

const Hero3D = dynamic(() => import("../components/os/Hero3D"), { ssr: false });

const trust = [
  { value: "99.9%", label: "Uptime target" },
  { value: "3x", label: "Faster ops delivery" },
  { value: "24/7", label: "Lead capture automation" },
  { value: "360", label: "Business visibility" }
];

const process = [
  { step: "01", title: "Architecture", copy: "Define revenue flow, conversion points, and operational bottlenecks." },
  { step: "02", title: "Build", copy: "Ship production website, admin system, and secure analytics stack." },
  { step: "03", title: "Scale", copy: "Track KPIs and execute weekly optimization cycles." }
];

const features = [
  "Conversion-ready website builds",
  "Digital marketing funnels (SEO + paid ads)",
  "Automated intake and CRM pipelines",
  "WhatsApp and email follow-up workflows",
  "AI assistant support and lead qualification",
  "Security, monitoring, and maintenance retainers"
];

const quickActions = [
  {
    title: "Book Free Audit",
    copy: "Share your goals and get a clear growth plan.",
    href: "/book",
    cta: "Start Audit"
  },
  {
    title: "View Services",
    copy: "See all website, automation, and marketing services.",
    href: "/services",
    cta: "See Services"
  },
  {
    title: "Digital Marketing",
    copy: "Explore the monthly Growth Ops package.",
    href: "/services/marketing",
    cta: "View Package"
  },
  {
    title: "Book Strategy Call",
    copy: "Choose a slot for a direct planning call.",
    href: "/book-call",
    cta: "Book Call"
  }
];

const fitCards = [
  {
    title: "For service businesses",
    copy: "If you need more calls, more leads, and a cleaner customer journey, this setup is built for you."
  },
  {
    title: "For growing local brands",
    copy: "If your website exists but your lead flow is weak, we connect marketing, forms, and follow-up properly."
  },
  {
    title: "For teams wasting time manually",
    copy: "If leads, bookings, and status updates are still manual, we turn that into a system."
  }
];

const serviceFallbackCards = [
  {
    title: "Productized website and brand launch",
    copy: "Professional website delivery with clear messaging, modern UI, and conversion-oriented structure."
  },
  {
    title: "Digital marketing growth ops",
    copy: "SEO, paid ads, and reporting workflows to bring qualified traffic and improve lead quality."
  },
  {
    title: "Intake workflow automation",
    copy: "Smart forms and lead routing that reduce manual follow-up and speed up your response time."
  },
  {
    title: "AI assistant and dashboard integrations",
    copy: "Assistant-driven support and visibility dashboards that help your team make faster decisions."
  },
  {
    title: "Maintenance and support",
    copy: "Ongoing updates, monitoring, and issue prevention to keep your platform stable and secure."
  },
  {
    title: "Secure admin and lead visibility",
    copy: "Role-based controls, lead tracking, and clear status updates for reliable daily operations."
  }
];

type QuickAction = {
  title: string;
  copy: string;
  href: Route;
  cta: string;
};

const typedQuickActions: QuickAction[] = quickActions.map((item) => ({
  ...item,
  href: item.href as Route
}));

const workHighlights = [
  { title: "Finance Ops Revamp", result: "42% faster conversion-to-call", type: "SaaS / Fintech" },
  { title: "Healthcare Intake Flow", result: "3.1x qualified lead growth", type: "Healthcare" },
  { title: "Retail Expansion Engine", result: "27% repeat customer lift", type: "Commerce" }
];

const blogHighlights = getFeaturedBlogPosts(3);

const pricing = [
  { name: "Digital Storefront", price: "INR 14,999 - 24,999", summary: "Fast deployment with strict scope boundaries" },
  { name: "Business Automation", price: "INR 39,999 - 59,999", summary: "Automated workflows replacing manual operations" },
  { name: "Digital Fortress & AI", price: "INR 89,999 - 1,49,999+", summary: "Custom backend, AI agents, and security hardening" }
];

const maintenancePlans = [
  {
    name: "Essential Care",
    period: "INR 2,000 - 3,500 / year",
    items: ["Managed hosting", "Weekly off-site backups", "SSL renewals", "24/7 uptime monitoring"]
  },
  {
    name: "Growth & Security",
    period: "INR 6,000 - 10,000 / year",
    items: ["Everything in Essential", "Vulnerability scans + patching", "DB optimization", "Monthly analytics report"]
  },
  {
    name: "Elite Retainer",
    period: "INR 14,999+ / year",
    items: ["Everything in Growth", "AI tuning and conversion review", "12h priority SLA", "Competitor intelligence automation"]
  }
];

const blogDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Asia/Kolkata"
});

export default function HomePage() {
  const [services, setServices] = useState<{ _id: string; title: string }[]>([]);
  const [caseStudies, setCaseStudies] = useState<{ _id?: string; title: string; result: string; type: string }[]>(
    []
  );
  const [activeTrack, setActiveTrack] = useState<"acquire" | "operate" | "expand">("acquire");
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/api/services")
      .then((res) => setServices(res.data))
      .catch(() => setServices([]));
    api
      .get("/api/reviews/public")
      .then((res) => setReviews(res.data.reviews || []))
      .catch(() => setReviews([]));
    api
      .get("/api/work")
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        setCaseStudies(
          items
            .filter((item) => item?.title)
            .slice(0, 3)
            .map((item) => ({
              _id: String(item._id ?? ""),
              title: String(item.title),
              result: String(item.result ?? "Project delivered successfully"),
              type: String(item.type ?? "Case Study")
            }))
        );
      })
      .catch(() => setCaseStudies([]));
  }, []);

  const trackContent = {
    acquire: {
      title: "Acquire",
      text: "AI-assisted conversion surfaces, intent scoring, and adaptive booking flows."
    },
    operate: {
      title: "Operate",
      text: "Agent-ready admin control, predictive KPI alerts, and operational observability."
    },
    expand: {
      title: "Expand",
      text: "Composable modules for new markets, services, and productized revenue streams."
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>Something went wrong loading this section.</h2>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      }
    >
      <main className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": "ZERO Business Automation Systems",
            "url": "https://zeroops.in",
            "logo": "https://zeroops.in/logo.png",
            "image": "https://zeroops.in/logo.png",
            "description": "ZERO provides websites, digital marketing systems, lead automation, and dashboard-driven growth infrastructure for small businesses.",
            "priceRange": "INR 14,999 - INR 149,999+",
            "areaServed": [
              { "@type": "City", "name": "Bangalore" },
              { "@type": "Country", "name": "India" },
              { "@type": "Place", "name": "Global" }
            ],
            "founder": {
              "@type": "Person",
              "name": "Nishanth Raj S",
              "jobTitle": "Full-Stack DevOps Engineer",
              "sameAs": [
                "https://www.linkedin.com/in/nishanth-raj-s",
                "https://github.com/nishanthrajs01-stack"
              ]
            },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Web Development Services",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Automated Landing Page Deployment",
                    "description": "High-conversion Next.js single page applications."
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Full-Stack Web App Development",
                    "description": "Custom Node.js/Express backends with automated CI/CD."
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Zero-Maintenance E-Commerce",
                    "description": "Secure, scalable storefronts with zero operational overhead."
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Digital Marketing Growth Ops",
                    "description": "SEO, paid ads, content, and analytics for consistent lead generation."
                  }
                }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "24"
            }
          })
        }}
      />
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pt-8 md:pt-12 pb-16 md:pb-24 grid lg:grid-cols-[1.15fr_0.85fr] gap-8 md:gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            Operating System for Growth Teams
          </p>
          <h1 className="mt-6 text-5xl md:text-7xl leading-[0.96] font-display tracking-tight text-[var(--ink)]">
            Websites, automation, and digital marketing in one growth system
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--muted)]">
            ZERO helps you attract better leads, automate follow-up, and convert faster with a clean,
            customer-friendly digital setup.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/book" className="btn-primary hover-lift rounded-full px-8 py-3.5 text-sm md:text-base font-semibold shadow-md shadow-[var(--ink)]/10">Book Free Audit</a>
            <a href="/services" className="btn-secondary rounded-full px-8 py-3.5 text-sm md:text-base font-semibold">View Services</a>
            <a href="/book-call" className="btn-secondary rounded-full px-8 py-3.5 text-sm md:text-base font-semibold">Book Call</a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="tilt-panel p-4 md:p-5 relative">
          <div className="rounded-2xl border border-black/10 bg-white/70 p-3 relative">
            <div className="h-[300px] md:h-[360px] rounded-xl overflow-hidden border border-black/10 bg-[var(--ink)]/95">
              <div className="hidden md:block h-full">
                <Hero3D />
              </div>
              <div className="md:hidden h-full grid place-items-center px-4 text-center text-white/70 text-sm">
                Mobile mode runs a lightweight visualization.
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.35 }}
              className="hero-brand-tag"
            >
              <ZeroLogo variant="white" />
              <p className="hero-brand-meta">REAL-TIME OPERATING MODEL</p>
            </motion.div>
            <div className="hero-pulse" />
          </div>
        </motion.div>

        <a
          href="https://resend.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group lg:col-start-2 -mt-3 md:-mt-4 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-900/10 bg-white/80 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm transition hover:border-slate-900/20 hover:bg-white/95"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.16)] transition group-hover:shadow-[0_0_0_7px_rgba(16,185,129,0.2)]" />
          <span className="text-center leading-none">
            Official Email Partner · Resend
          </span>
          <span className="inline-flex items-center rounded-lg border border-slate-900/15 bg-white px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <img src="/resend-logo.svg" alt="Resend official logo" className="block h-4 w-auto" />
          </span>
        </a>
      </section>

      <section className="relative z-10 border-y border-black/10 bg-white/45 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 py-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {trust.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.28, delay: i * 0.05 }}
            >
              <p className="text-3xl font-display text-[var(--ink)]">{item.value}</p>
              <p className="text-sm text-[var(--muted)] mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">Start Here</p>
            <h2 className="text-3xl md:text-4xl font-display text-[var(--ink)] mt-2">Pick your next step in seconds</h2>
          </div>
          <p className="max-w-md text-sm text-[var(--muted)] leading-relaxed">
            Choose the path that matches your current need. Every action leads to a clear next step.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {typedQuickActions.map((item) => (
            <article key={item.title} className="soft-card p-5">
              <h3 className="text-xl font-display text-[var(--ink)]">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{item.copy}</p>
              <Link href={item.href} className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4">
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-8 md:pb-12">
        <div className="soft-card p-6 md:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">Best Fit</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-display text-[var(--ink)] leading-tight">
              Built for businesses that want growth without chaos
            </h2>
            <p className="mt-3 text-sm md:text-base text-[var(--muted)] leading-relaxed">
              We are the right fit when you want a professional website, stronger lead flow, and a system that
              keeps working after launch.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {fitCards.map((item) => (
              <article key={item.title} className="rounded-2xl border border-black/10 bg-white/70 p-5">
                <h3 className="text-xl font-display text-[var(--ink)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 md:gap-8">
          <div className="dark-card p-6 md:p-8 lg:p-10 flex flex-col justify-center">
            <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-white/70">Pricing</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display mt-3 leading-tight">Transparent pricing for build + growth</h2>
            <p className="text-sm md:text-base text-white/90 mt-4 leading-relaxed">Simple packages for website delivery, automation, and digital marketing execution.</p>
            <div className="mt-8">
              <a href="/pricing" className="inline-block hover-lift btn-secondary rounded-full px-6 md:px-8 py-3 text-sm md:text-base font-semibold bg-white text-[var(--ink)] border-white">Full Pricing Breakdown</a>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricing.map((plan) => (
              <article key={plan.name} className="soft-card p-6 md:p-7 flex flex-col hover-lift transition-all">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{plan.name}</p>
                <p className="text-3xl md:text-4xl font-display text-[var(--ink)] mt-3">{plan.price}</p>
                <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed flex-1">{plan.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 md:gap-8 items-end mb-8">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">Core Services</p>
            <h2 className="text-4xl md:text-5xl font-display text-[var(--ink)] mt-3 leading-[1.02]">
              Website, digital marketing, and automation services
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/services" className="btn-primary rounded-full px-5 py-2.5 text-sm">
                View All Services
              </Link>
              <Link href="/book" className="btn-secondary rounded-full px-5 py-2.5 text-sm">
                Book Free Audit
              </Link>
            </div>
          </div>

          <p className="text-sm md:text-base text-[var(--muted)] leading-relaxed lg:max-w-md lg:ml-auto">
            From storefront launches to growth campaigns and AI-driven operations, we build systems that remove manual workload and compound growth.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {services.length > 0 ? (
            services.slice(0, 6).map((service, i) => (
              <motion.article
                key={service._id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="soft-card p-6 md:p-7 hover-lift h-full flex flex-col"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="text-2xl font-display text-[var(--ink)] mt-2">{service.title}</h3>
                <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
                  Modular delivery with analytics-backed iteration, automation depth, and secure operational setup.
                </p>
              </motion.article>
            ))
          ) : (
            <>
              {serviceFallbackCards.map((item, i) => (
                <article key={item.title} className="soft-card p-6 md:p-7 hover-lift h-full flex flex-col">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-2xl font-display text-[var(--ink)] mt-2">{item.title}</h3>
                  <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
                    {item.copy}
                  </p>
                </article>
              ))}
            </>
          )}
        </div>
      </section>

      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <div className="soft-card p-6 md:p-8 lg:p-10">
          <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-[var(--muted)] font-semibold">Features</p>
          <h2 className="text-3xl md:text-5xl font-display text-[var(--ink)] mt-3 leading-tight">Built-in operating capabilities.</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {features.map((item) => (
              <div key={item} className="rounded-xl border border-black/10 bg-white/60 p-5 text-[var(--ink)] font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="maintenance" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <div className="soft-card p-6 md:p-8 lg:p-10">
          <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-[var(--muted)] font-semibold">Maintenance</p>
          <h2 className="text-3xl md:text-5xl font-display text-[var(--ink)] mt-3 leading-tight">Recurring care plans that protect uptime, speed, and security.</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {maintenancePlans.map((plan) => (
              <article key={plan.name} className="rounded-xl border border-black/10 bg-white/60 p-6 md:p-7 hover-lift transition-all">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{plan.period}</p>
                <h3 className="text-2xl font-display text-[var(--ink)] mt-2">{plan.name}</h3>
                <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2"><span className="text-[var(--accent)]">-</span> {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="technology"
        className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setSpotlight({ x, y });
        }}
      >
        <div className="tech-shell p-6 md:p-10" style={{ ["--spot-x" as string]: `${spotlight.x}%`, ["--spot-y" as string]: `${spotlight.y}%` }}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-white/70 font-semibold">Technology 2026</p>
              <h2 className="text-3xl md:text-5xl font-display text-white mt-3 leading-tight">Enterprise Engineers for Small Businesses</h2>
            </div>
            <p className="max-w-md text-sm md:text-base text-white/80 leading-relaxed">
              Built with agentic workflows, event-driven automations, and secure production architecture expected in modern 2026 SaaS delivery.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4 mt-6">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Agentic Automation Layer",
                "Predictive Analytics Signals",
                "Role-Aware Security Guardrails",
                "Composable Service Modules",
                "Real-time Event Notification Bus",
                "Edge-ready API strategy"
              ].map((item) => (
                <div key={item} className="tech-chip">{item}</div>
              ))}
            </div>
            <div className="tech-panel">
              <p className="text-xs uppercase tracking-[0.18em] text-white/65">Growth Tracks</p>
              <div className="flex gap-2 mt-3">
                {(["acquire", "operate", "expand"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveTrack(key)}
                    className={`track-btn ${activeTrack === key ? "track-btn-active" : ""}`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <h3 className="text-2xl font-display text-white mt-4">{trackContent[activeTrack].title}</h3>
              <p className="text-sm text-white/75 mt-2">{trackContent[activeTrack].text}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-10 md:pb-12">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">Process</p>
          <h2 className="text-3xl md:text-4xl font-display text-[var(--ink)] mt-2">How we execute your growth system</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {process.map((item) => (
            <article key={item.step} className="soft-card p-6">
              <p className="font-mono text-sm text-[var(--accent)]">{item.step}</p>
              <h3 className="text-2xl font-display text-[var(--ink)] mt-2">{item.title}</h3>
              <p className="text-sm text-[var(--muted)] mt-2">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">Case Studies</p>
            <h2 className="text-3xl md:text-4xl font-display text-[var(--ink)] mt-2">Growth outcomes from shipped systems</h2>
          </div>
          <Link href="/works" className="btn-secondary rounded-full px-5 py-2 text-sm">
            View all case studies
          </Link>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {(caseStudies.length > 0 ? caseStudies : workHighlights).map((work) => (
            <article key={`${work.title}-${work.type}`} className="soft-card p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{work.type}</p>
              <h3 className="text-2xl font-display text-[var(--ink)] mt-2">{work.title}</h3>
              <p className="text-sm text-[var(--accent)] mt-3">{work.result}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="blog" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-12 md:pb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">SEO Insights</p>
            <h2 className="text-3xl md:text-4xl font-display text-[var(--ink)] mt-2">Marketing and automation playbooks</h2>
          </div>
          <Link href="/blog" className="btn-secondary rounded-full px-5 py-2 text-sm w-fit">
            Explore Blog
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {blogHighlights.map((post) => (
            <article key={post.slug} className="soft-card p-6 flex flex-col">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                {blogDateFormatter.format(new Date(post.publishedAt))} | {post.readingMinutes} min read
              </p>
              <h3 className="text-2xl font-display text-[var(--ink)] mt-3">{post.title}</h3>
              <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed flex-1">{post.description}</p>
              <Link href={`/blog/${post.slug}` as Route} className="mt-5 inline-flex text-sm font-semibold underline">
                Read article
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-16 md:pb-24">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--muted)]">Testimonials</p>
            <h2 className="text-4xl md:text-5xl font-display text-[var(--ink)] mt-3">What Our Clients Say</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <motion.article
                key={r.createdAt}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="soft-card p-8 flex flex-col hover-lift"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, starIdx) => (
                    <span key={starIdx} className={starIdx < r.rating ? "text-amber-400" : "text-gray-200"}>*</span>
                  ))}
                </div>
                <p className="text-[var(--ink)] leading-relaxed italic flex-1">
                  "{r.testimonial}"
                </p>
                <p className="text-sm font-semibold text-[var(--muted)] mt-6">- {r.clientName}</p>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      <section id="book" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-16 md:pb-20">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 md:gap-8 items-start">
          <div className="dark-card p-8 md:p-10 lg:p-12">
            <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-white/70 font-semibold">Consultation</p>
            <h2 className="text-3xl md:text-5xl font-display mt-4 leading-tight">Plan your next build sprint.</h2>
            <p className="text-white/90 mt-5 leading-relaxed">Share your business context, desired outcomes, and delivery timeline. Start systemizing today.</p>
          </div>

          <div className="soft-card p-6 md:p-8">
            <BookingRequestForm />
          </div>
        </div>
      </section>

        <SiteFooter />
      </main>
    </ErrorBoundary>
  );
}













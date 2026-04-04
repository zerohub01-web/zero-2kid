"use client";

import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { BookingRequestForm } from "../../components/booking/BookingRequestForm";

export default function BookPage() {
  if (process.env.NODE_ENV === "development") {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const recaptchaMode = process.env.NEXT_PUBLIC_RECAPTCHA_MODE ?? "checkbox";
    if (!siteKey || siteKey === "your_site_key_here") {
      console.warn(
        "WARNING: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set.",
        recaptchaMode === "v3"
          ? "Booking form requires a Google reCAPTCHA v3 site key for automatic verification."
          : "Booking form requires a Google reCAPTCHA v2 checkbox site key."
      );
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.warn(
        "WARNING: NEXT_PUBLIC_API_BASE_URL not set.",
        "Bookings proxy will fall back through local API candidates before it reaches the live API."
      );
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <section className="relative z-10 max-w-5xl mx-auto mt-8 pb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Public Booking</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Request your free consultation.</h1>
        <p className="text-sm md:text-base text-[var(--muted)] mt-4 max-w-2xl">
          Submit your requirement without login. We validate each request in real time and protect this form
          with anti-spam controls.
        </p>

        <div className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3">
            <p className="font-semibold text-[var(--ink)]">No login required</p>
            <p className="mt-1 text-[var(--muted)]">Fast form submission in under 2 minutes.</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3">
            <p className="font-semibold text-[var(--ink)]">Real team follow-up</p>
            <p className="mt-1 text-[var(--muted)]">Email and WhatsApp updates after your request.</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3">
            <p className="font-semibold text-[var(--ink)]">Track your request</p>
            <p className="mt-1 text-[var(--muted)]">Get a lead ID to check status anytime.</p>
          </div>
        </div>

        <div className="soft-card p-6 md:p-8 mt-8">
          <BookingRequestForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

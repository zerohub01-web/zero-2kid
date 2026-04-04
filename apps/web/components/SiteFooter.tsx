import type { Route } from "next";
import Link from "next/link";
import { ZeroLogo } from "./brand/ZeroLogo";

const socials = [
  { name: "Instagram", href: "https://www.instagram.com/_zero_ops_", label: "IG" },
  { name: "Facebook", href: "https://www.facebook.com/karthikeyansp", label: "FB" },
  { name: "LinkedIn", href: "https://linkedin.com/", label: "IN" },
  { name: "WhatsApp", href: "https://wa.me/918590464379", label: "WA" }
];

const quickLinks: { label: string; href: Route }[] = [
  { label: "Home", href: "/" as Route },
  { label: "Services", href: "/services" as Route },
  { label: "Digital Marketing", href: "/services/marketing" as Route },
  { label: "Pricing", href: "/pricing" as Route },
  { label: "Book", href: "/book" as Route },
  { label: "Book Call", href: "/book-call" as Route }
];

const focusAreas = [
  "Websites and landing pages",
  "Digital marketing systems",
  "Lead capture and follow-up",
  "Admin dashboards and portals",
  "WhatsApp and email automation"
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pb-14 md:pb-8">
      <div className="soft-card p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <ZeroLogo variant="inverted" />
            <p className="mt-2 text-sm text-[var(--muted)]">
              ZERO builds business automation systems that reduce manual work and help teams scale operations.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Quick Links</p>
            <div className="mt-2 space-y-1.5 text-sm">
              {quickLinks.map((item) => (
                <div key={item.href}>
                  <Link href={item.href} className="text-[var(--ink)] hover:underline">
                    {item.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">What We Do</p>
            <div className="mt-2 space-y-1.5 text-sm text-[var(--ink)]">
              {focusAreas.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Address</p>
            <p className="mt-2 text-sm text-[var(--ink)]">
              ZERO Business Automation Systems
              <br />
              Hillside Meadows 56, MS Palaya, Vidhyaranyapura Post, Adityanagar, Vidyaranyapura, Bengaluru, Karnataka 560097
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Contact</p>
            <div className="mt-2 text-sm text-[var(--ink)] space-y-1">
              <p>Email: <a className="underline" href="mailto:zerohub01@gmail.com">zerohub01@gmail.com</a></p>
              <p>Phone: <a className="underline" href="tel:+918590464379">+91 8590464379</a></p>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-black/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {socials.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white transition"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px]">{item.label}</span>
                {item.name}
              </a>
            ))}
          </div>
          <div className="text-xs text-[var(--muted)]">
            Copyright {new Date().getFullYear()} ZERO. Automate, save time, and scale with clarity.
          </div>
        </div>
      </div>
    </footer>
  );
}

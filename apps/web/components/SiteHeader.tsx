"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ZeroLogo } from "./brand/ZeroLogo";

type NavItem = {
  href: Route;
  label: string;
};

interface SiteHeaderProps {
  portalMode?: boolean;
  onLogout?: () => void;
}

const baseNavItems: NavItem[] = [
  { href: "/pricing", label: "Pricing" },
  { href: "/services", label: "Services" },
  { href: "/services/marketing" as Route, label: "Marketing" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/works", label: "Works" },
  { href: "/blog" as Route, label: "Blog" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/process", label: "Process" }
];

const desktopNavItems: NavItem[] = [
  { href: "/pricing", label: "Pricing" },
  { href: "/services", label: "Services" },
  { href: "/services/marketing" as Route, label: "Marketing" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/works", label: "Works" },
  { href: "/blog" as Route, label: "Blog" },
  { href: "/testimonials", label: "Testimonials" }
];

export function SiteHeader({ portalMode = false, onLogout }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const portalNavItems: NavItem[] = useMemo(
    () => [
      { href: "/client-dashboard" as Route, label: "Dashboard" },
      { href: "/book-call" as Route, label: "Book Call" },
      { href: "/book" as Route, label: "New Request" }
    ],
    []
  );

  const navItems = useMemo(
    () => (portalMode ? portalNavItems : baseNavItems),
    [portalMode, portalNavItems]
  );
  const topNavItems = useMemo(
    () => (portalMode ? portalNavItems : desktopNavItems),
    [portalMode, portalNavItems]
  );

  const isActive = (href: Route) => pathname === href;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 lg:px-12 pt-3 md:pt-4">
          <div className="glass-header header-shell px-4 md:px-5 py-3 flex items-center justify-between gap-3">
            <div className="logo-glass shrink-0">
              <Link href="/" aria-label="ZERO Home">
                <ZeroLogo variant="inverted" />
              </Link>
            </div>

            <nav className="hidden xl:flex flex-1 min-w-0 items-center justify-start gap-1 text-sm pl-3" aria-label="Primary">
              {topNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`header-link ${isActive(item.href) ? "header-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="header-actions hidden xl:flex items-center gap-2 shrink-0">
              {!portalMode ? (
                <>
                  <Link href={"/book-call" as Route} className="header-cta-secondary rounded-full px-4 py-2 text-sm">
                    Book Call
                  </Link>
                  <Link href={"/book" as Route} className="header-cta-primary rounded-full px-4 py-2 text-sm">
                    Book
                  </Link>
                  <Link href={"/client-login" as Route} className="header-cta-secondary rounded-full px-4 py-2 text-sm">
                    Client Login
                  </Link>
                </>
              ) : (
                <>
                  <Link href={"/" as Route} className="header-cta-secondary rounded-full px-4 py-2 text-sm">
                    Home
                  </Link>
                  {onLogout ? (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="btn-secondary rounded-full px-4 py-1.5 text-sm inline-flex items-center gap-1.5"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex xl:hidden items-center gap-2">
              {!portalMode ? (
                <Link href="/book" className="header-cta-primary rounded-full px-4 py-1.5 text-sm">
                  Book
                </Link>
              ) : (
                <Link href="/client-dashboard" className="header-cta-primary rounded-full px-4 py-1.5 text-sm">
                  Dashboard
                </Link>
              )}

              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((prev) => !prev)}
                className="header-menu-btn"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {open ? (
            <nav className="glass-header mt-2 p-3 xl:hidden" aria-label="Mobile Primary">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`header-link ${isActive(item.href) ? "header-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {!portalMode ? (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Link
                    href={"/book" as Route}
                    onClick={() => setOpen(false)}
                    className="header-cta-primary rounded-full px-4 py-2 text-sm inline-flex justify-center"
                  >
                    Book
                  </Link>
                  <Link
                    href={"/book-call" as Route}
                    onClick={() => setOpen(false)}
                    className="header-cta-secondary rounded-full px-4 py-2 text-sm inline-flex justify-center"
                  >
                    Book Call
                  </Link>
                  <Link
                    href={"/client-login" as Route}
                    onClick={() => setOpen(false)}
                    className="header-cta-secondary rounded-full px-4 py-2 text-sm inline-flex justify-center"
                  >
                    Client Login
                  </Link>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <Link
                    href={"/" as Route}
                    onClick={() => setOpen(false)}
                    className="header-cta-secondary rounded-full px-4 py-2 text-sm inline-flex justify-center"
                  >
                    Home
                  </Link>
                  {onLogout ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onLogout();
                      }}
                      className="btn-secondary rounded-full px-4 py-2 text-sm inline-flex items-center justify-center gap-1.5"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  ) : null}
                </div>
              )}
            </nav>
          ) : null}
        </div>
      </header>

      <div
        aria-hidden
        className={open ? "h-[16.25rem] sm:h-[16.75rem] xl:h-[6.5rem]" : "h-[6.15rem] sm:h-[6.5rem]"}
      />
    </>
  );
}

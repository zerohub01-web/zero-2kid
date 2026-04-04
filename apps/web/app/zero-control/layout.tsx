"use client";

import type { Route } from "next";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  BarChart3,
  FileSignature,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  MessageSquareMore,
  PhoneCall,
  ReceiptText,
  Settings,
  Star,
  Users
} from "lucide-react";
import { ZeroLogo } from "../../components/brand/ZeroLogo";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
};

type NavSection = {
  heading: string;
  items: NavItem[];
};

export default function ZeroControlAdminLayout({ children }: { children: ReactNode }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [pendingContracts, setPendingContracts] = useState(0);

  const callLogoutEndpoint = async (url: string) => {
    try {
      const response = await api.post(url, undefined, {
        validateStatus: () => true
      });
      return response.status;
    } catch {
      return 0;
    }
  };

  const isAcceptableStatus = (status: number) =>
    status === 0 || status === 200 || status === 204 || status === 401 || status === 403 || status === 404 || status === 500;

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const loadingId = toast.loading("Signing out...");

    try {
      const [adminStatus, customerStatus] = await Promise.all([
        callLogoutEndpoint("/api/admin/logout"),
        callLogoutEndpoint("/api/auth/logout")
      ]);

      useAuthStore.getState().setAdmin(undefined);

      if (!isAcceptableStatus(adminStatus) || !isAcceptableStatus(customerStatus)) {
        toast.error("Logout partially failed. Redirecting to login...", { id: loadingId });
      } else {
        toast.success("Logged out successfully.", { id: loadingId });
      }

      window.location.assign("/login");
    } catch {
      useAuthStore.getState().setAdmin(undefined);
      toast.error("Could not verify logout. Redirecting to login...", { id: loadingId });
      window.location.assign("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchBadges = async () => {
      try {
        const [invoiceStats, contractStats] = await Promise.all([
          api.get<{ pendingCount?: number; awaitingSignature?: number }>("/api/invoices/stats/overview"),
          api.get<{ pendingSignatureCount?: number }>("/api/contracts/stats/overview")
        ]);

        if (cancelled) return;

        const pendingInvoice = Number(invoiceStats.data?.pendingCount ?? 0);
        const awaitingInvoiceSignature = Number(invoiceStats.data?.awaitingSignature ?? 0);
        const pendingContractSignature = Number(contractStats.data?.pendingSignatureCount ?? 0);

        setPendingInvoices(Math.max(0, pendingInvoice + awaitingInvoiceSignature));
        setPendingContracts(Math.max(0, pendingContractSignature));
      } catch {
        if (!cancelled) {
          setPendingInvoices(0);
          setPendingContracts(0);
        }
      }
    };

    void fetchBadges();
    const timer = window.setInterval(fetchBadges, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const sections: NavSection[] = [
    {
      heading: "MAIN",
      items: [
        { label: "Dashboard", href: "/zero-control", icon: <Home size={18} /> },
        { label: "Lead Inbox", href: "/zero-control/clients", icon: <Users size={18} /> },
        { label: "Bookings", href: "/zero-control/clients", icon: <Users size={18} /> }
      ]
    },
    {
      heading: "COMMUNICATION",
      items: [
        { label: "WhatsApp Conversations", href: "/zero-control/whatsapp", icon: <MessageCircle size={18} /> },
        { label: "Smart Follow-ups", href: "/zero-control/followups", icon: <MessageSquareMore size={18} /> },
        { label: "Call Bookings", href: "/zero-control/calls", icon: <PhoneCall size={18} /> }
      ]
    },
    {
      heading: "DOCUMENTS",
      items: [
        {
          label: "Contracts",
          href: "/zero-control/contracts",
          icon: <FileSignature size={18} />,
          badge: pendingContracts
        },
        {
          label: "Invoices",
          href: "/zero-control/invoices",
          icon: <ReceiptText size={18} />,
          badge: pendingInvoices
        },
        { label: "Proposals", href: "/zero-control/proposals", icon: <FileText size={18} /> }
      ]
    },
    {
      heading: "SETTINGS",
      items: [
        { label: "Analytics", href: "/zero-control/analytics", icon: <BarChart3 size={18} /> },
        { label: "Reviews", href: "/zero-control/reviews", icon: <Star size={18} /> },
        { label: "Settings", href: "/zero-control/settings", icon: <Settings size={18} /> }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-a)] flex">
      <aside className="w-72 border-r border-black/10 bg-white/50 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-black/10">
          <ZeroLogo variant="inverted" />
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)] font-semibold mt-6">Admin Control</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.heading} className="mb-6 last:mb-0">
              <p className="px-4 pb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] font-bold">
                {section.heading}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={`${section.heading}-${item.href}`}
                    href={item.href as Route}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]"
                  >
                    <span className="inline-flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                    {typeof item.badge === "number" && item.badge > 0 ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-black/10">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogOut size={18} /> {isLoggingOut ? "Exiting..." : "Exit Admin"}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">{children}</main>
    </div>
  );
}

"use client";

import { ZeroLogo } from "../../components/brand/ZeroLogo";
import { api } from "../../lib/api";
import { toast } from "react-hot-toast";
import { LogOut, Home, Users, BarChart, Briefcase, FileText, ReceiptText, FileSignature, Settings } from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth";

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
    status === 0 ||
    status === 200 ||
    status === 204 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 500 ||
    status === 502 ||
    status === 503;

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

  return (
    <div className="min-h-screen bg-[var(--bg-a)] flex">
      <aside className="w-64 border-r border-black/10 bg-white/50 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-black/10">
          <ZeroLogo variant="inverted" />
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)] font-semibold mt-6">Admin Control</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/zero-control" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <Home size={18} /> Dashboard
          </Link>

          <Link href="/zero-control/clients" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <Users size={18} /> Bookings
          </Link>

          <Link href="/zero-control/contracts" className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <span className="inline-flex items-center gap-3">
              <FileSignature size={18} /> Contracts
            </span>
            {pendingContracts > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {pendingContracts}
              </span>
            ) : null}
          </Link>

          <Link href="/zero-control/invoices" className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <span className="inline-flex items-center gap-3">
              <ReceiptText size={18} /> Invoices
            </span>
            {pendingInvoices > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {pendingInvoices}
              </span>
            ) : null}
          </Link>

          <Link href="/zero-control/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <Settings size={18} /> Settings
          </Link>

          <Link href="/zero-control/works" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <Briefcase size={18} /> Previous Works
          </Link>

          <Link href="/zero-control/blog" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <FileText size={18} /> Blog Manager
          </Link>

          <Link href="/zero-control/analytics" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-black/5 text-sm font-medium transition text-[var(--ink)]">
            <BarChart size={18} /> Analytics
          </Link>
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

"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Circle, Download, Loader2, Mail, MessageSquare, CheckCheck } from "lucide-react";
import { api } from "../../../../../lib/api";
import { buildWhatsAppLink } from "../../../../../utils/whatsapp";

interface ContractView {
  id: string;
  contractNumber: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "COMPLETED" | "CANCELLED";
  clientName: string;
  clientEmail: string;
  serviceType: string;
  createdAt: string;
  emailSentAt?: string;
  viewedAt?: string;
  viewCount?: number;
  clientSignedAt?: string;
  effectiveDate: string;
  totalAmount?: number;
  currencySymbol?: string;
  portalLink?: string;
}

function isDone(current: ContractView["status"], target: ContractView["status"]): boolean {
  const order: ContractView["status"][] = ["DRAFT", "SENT", "VIEWED", "SIGNED", "COMPLETED"];
  return order.indexOf(current) >= order.indexOf(target);
}

function formatMoney(symbol: string, amount?: number): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ContractDetailViewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [contract, setContract] = useState<ContractView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  const fetchContract = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/contracts/${id}`);
      setContract(data as ContractView);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load contract details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContract();
  }, [id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const reminderLink = useMemo(() => {
    if (!contract) return "";
    const phone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "918590464379";
    const fallbackOrigin = process.env.NEXT_PUBLIC_WEB_URL || "";
    const portalLink =
      contract.portalLink || `${(origin || fallbackOrigin).replace(/\/$/, "")}/portal/contract/${contract.id}`;
    const message = `Hi ${contract.clientName}, your service agreement (${contract.contractNumber}) from ZERO OPS is awaiting your signature. Please sign here: ${portalLink}`;
    return buildWhatsAppLink(phone, message);
  }, [contract, origin]);

  const resendContract = async () => {
    if (!contract) return;
    setBusy(true);
    try {
      await api.post(`/api/contracts/${contract.id}/send`);
      toast.success("Contract sent again.");
      await fetchContract();
    } catch (error) {
      console.error(error);
      toast.error("Failed to resend contract.");
    } finally {
      setBusy(false);
    }
  };

  const markComplete = async () => {
    if (!contract) return;
    setBusy(true);
    try {
      await api.patch(`/api/contracts/${contract.id}`, { status: "COMPLETED" });
      toast.success("Contract marked complete.");
      await fetchContract();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update contract status.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[360px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (!contract) {
    return <div className="soft-card p-8 text-sm text-[var(--muted)]">Contract not found.</div>;
  }

  return (
    <section className="space-y-5">
      <header className="soft-card p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Contract Tracker</p>
        <h1 className="text-3xl font-display text-[var(--ink)] mt-2">{contract.contractNumber}</h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          {contract.clientName} - {contract.serviceType}
        </p>
      </header>

      <section className="soft-card p-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-black/10 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Contract Value</p>
          <p className="text-2xl font-semibold mt-2">{formatMoney(contract.currencySymbol || "\u20B9", contract.totalAmount)}</p>
          <p className="text-sm text-[var(--muted)] mt-2">Effective Date: {new Date(contract.effectiveDate).toLocaleDateString("en-IN")}</p>
        </article>

        <article className="rounded-xl border border-black/10 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Current Status</p>
          <p className="text-2xl font-semibold mt-2">{contract.status}</p>
          <p className="text-sm text-[var(--muted)] mt-2">Views: {contract.viewCount || 0}</p>
        </article>
      </section>

      <section className="soft-card p-6">
        <h2 className="text-xl font-semibold text-[var(--ink)] mb-4">Activity Timeline</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Created - {new Date(contract.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isDone(contract.status, "SENT") ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-slate-400" />}
            <span>Sent to {contract.clientEmail} - {contract.emailSentAt ? new Date(contract.emailSentAt).toLocaleString("en-IN") : "pending"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isDone(contract.status, "VIEWED") ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-slate-400" />}
            <span>Viewed by client - {contract.viewedAt ? `${new Date(contract.viewedAt).toLocaleString("en-IN")} (${contract.viewCount || 0} views)` : "pending"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isDone(contract.status, "SIGNED") ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-slate-400" />}
            <span>Signed - {contract.clientSignedAt ? new Date(contract.clientSignedAt).toLocaleString("en-IN") : "awaiting"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isDone(contract.status, "COMPLETED") ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-slate-400" />}
            <span>Completed - {contract.status === "COMPLETED" ? "done" : "pending"}</span>
          </div>
        </div>
      </section>

      <section className="soft-card p-6">
        <h2 className="text-xl font-semibold text-[var(--ink)] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void resendContract()} disabled={busy} className="px-4 py-2 rounded-lg bg-sky-100 text-sky-800 text-sm font-semibold inline-flex items-center gap-2">
            <Mail size={14} /> Resend Email
          </button>

          <a href={`/api/contracts/${contract.id}/pdf`} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-semibold inline-flex items-center gap-2">
            <Download size={14} /> Download PDF
          </a>

          <button type="button" onClick={() => void markComplete()} disabled={busy || contract.status === "COMPLETED"} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
            <CheckCheck size={14} /> Mark Complete
          </button>

          <a href={reminderLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold inline-flex items-center gap-2">
            <MessageSquare size={14} /> Send WhatsApp Reminder
          </a>

          <Link href={`/zero-control/contracts/${contract.id}` as Route} className="px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-semibold">
            Edit Contract
          </Link>
        </div>
      </section>
    </section>
  );
}

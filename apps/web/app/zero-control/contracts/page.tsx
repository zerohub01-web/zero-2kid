"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, FileDown, Loader2, Mail, Plus, RefreshCcw } from "lucide-react";
import { api } from "../../../lib/api";

type ContractStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "COMPLETED" | "CANCELLED";

interface ContractRow {
  id: string;
  contractNumber: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  status: ContractStatus;
  createdAt: string;
  viewCount?: number;
  portalTokens?: {
    pdf?: string;
  };
}

interface ContractStats {
  totalContracts: number;
  pendingSignatureCount: number;
  signedCount: number;
  draftCount: number;
}

const statusStyles: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SENT: "bg-sky-100 text-sky-700",
  VIEWED: "bg-amber-100 text-amber-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-700 text-white",
  CANCELLED: "bg-red-100 text-red-700"
};

export default function ZeroControlContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ContractStatus>("ALL");
  const [query, setQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, statsRes] = await Promise.all([api.get("/api/contracts"), api.get("/api/contracts/stats/overview")]);
      setRows(Array.isArray(contractsRes.data) ? (contractsRes.data as ContractRow[]) : []);
      setStats(statsRes.data as ContractStats);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!search) return true;
      return [row.contractNumber, row.clientName, row.clientEmail, row.serviceType].join(" ").toLowerCase().includes(search);
    });
  }, [rows, statusFilter, query]);

  const sendContract = async (id: string) => {
    setSendingId(id);
    try {
      const { data } = await api.post(`/api/contracts/${id}/send`);
      if (data?.emailSent === false) {
        toast.error(data?.message || "Contract marked as sent, but email delivery failed.");
      } else if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
        toast(data?.message || "Contract sent with warnings.");
      } else {
        toast.success(data?.message || "Contract sent to client.");
      }
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to send contract.");
    } finally {
      setSendingId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">Service Agreements</h1>
            <p className="text-sm text-[var(--muted)] mt-2">Create, send, and track client contracts.</p>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void fetchData()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 bg-white hover:bg-black/5 text-sm">
              <RefreshCcw size={14} /> Refresh
            </button>
            <Link href={"/zero-control/contracts/new" as Route} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ink)] text-white text-sm font-semibold">
              <Plus size={14} /> New Contract
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Total Contracts</p>
            <p className="text-xl font-semibold mt-2">{stats?.totalContracts ?? 0}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Pending Signature</p>
            <p className="text-xl font-semibold mt-2">{stats?.pendingSignatureCount ?? 0}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Signed</p>
            <p className="text-xl font-semibold mt-2">{stats?.signedCount ?? 0}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Draft</p>
            <p className="text-xl font-semibold mt-2">{stats?.draftCount ?? 0}</p>
          </article>
        </div>
      </header>

      <section className="soft-card p-6">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | ContractStatus)} className="field py-2.5">
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="SIGNED">Signed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by contract number, client, email" className="field py-2.5" />
        </div>

        {loading ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-[var(--muted)] mt-4">No contracts found.</div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 text-left">Contract #</th>
                  <th className="py-3 text-left">Client</th>
                  <th className="py-3 text-left">Service</th>
                  <th className="py-3 text-left">Status</th>
                  <th className="py-3 text-left">Date</th>
                  <th className="py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 font-semibold">{row.contractNumber}</td>
                    <td className="py-3">
                      <p className="font-medium">{row.clientName}</p>
                      <p className="text-xs text-[var(--muted)]">{row.clientEmail}</p>
                    </td>
                    <td className="py-3">{row.serviceType}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyles[row.status]}`}>
                        {row.status === "VIEWED" ? <Eye size={12} /> : null}
                        {row.status}
                        {row.status === "VIEWED" ? ` (${row.viewCount || 0})` : ""}
                      </span>
                    </td>
                    <td className="py-3">{new Date(row.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-3">
                      {(() => {
                        const pdfToken = row.portalTokens?.pdf || "";
                        const pdfHref = pdfToken
                          ? `/api/contracts/${row.id}/pdf?token=${encodeURIComponent(pdfToken)}`
                          : `/api/contracts/${row.id}/pdf`;
                        return (
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/zero-control/contracts/${row.id}` as Route} className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-xs">
                          Edit
                        </Link>
                        <Link href={`/zero-control/contracts/${row.id}/view` as Route} className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-xs">
                          View
                        </Link>
                        <button type="button" onClick={() => void sendContract(row.id)} disabled={sendingId === row.id} className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 text-xs font-semibold disabled:opacity-60 inline-flex items-center gap-1">
                          <Mail size={12} />
                          {sendingId === row.id ? "Sending" : "Send"}
                        </button>
                        <a href={pdfHref} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-xs inline-flex items-center gap-1">
                          <FileDown size={12} /> PDF
                        </a>
                      </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

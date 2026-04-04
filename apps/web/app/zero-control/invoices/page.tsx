"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, FileDown, Loader2, Mail, Plus, RefreshCcw } from "lucide-react";
import { api } from "../../../lib/api";

type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "PAID" | "OVERDUE" | "CANCELLED";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientBusiness: string;
  totalAmount: number;
  currencySymbol: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  viewCount?: number;
}

interface InvoiceStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  pendingCount: number;
  paidThisMonth: number;
  awaitingSignature: number;
}

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SENT: "bg-sky-100 text-sky-700",
  VIEWED: "bg-amber-100 text-amber-700",
  SIGNED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PAID: "bg-emerald-600 text-white",
  OVERDUE: "bg-red-600 text-white",
  CANCELLED: "bg-slate-300 text-slate-800"
};

function money(symbol: string, amount: number): string {
  const curr = symbol || "₹";
  return `${curr}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function parseDate(value: string): number {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export default function ZeroControlInvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | InvoiceStatus>("ALL");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoiceRes, statsRes] = await Promise.all([
        api.get("/api/invoices"),
        api.get("/api/invoices/stats/overview")
      ]);

      setRows(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      setStats(statsRes.data as InvoiceStats);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (search) {
        const hit = [row.invoiceNumber, row.clientName, row.clientEmail, row.clientBusiness]
          .join(" ")
          .toLowerCase()
          .includes(search);
        if (!hit) return false;
      }

      const createdTime = parseDate(row.createdAt);
      if (fromDate && createdTime < parseDate(fromDate)) return false;
      if (toDate) {
        const endTs = parseDate(toDate) + 24 * 60 * 60 * 1000 - 1;
        if (createdTime > endTs) return false;
      }

      return true;
    });
  }, [fromDate, query, rows, statusFilter, toDate]);

  const sendInvoice = async (id: string) => {
    setSendingId(id);
    try {
      await api.post(`/api/invoices/${id}/send`);
      toast.success("Invoice email sent.");
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to send invoice.");
    } finally {
      setSendingId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">Invoices and Proposals</h1>
            <p className="text-sm text-[var(--muted)] mt-2">Create, send, and track client invoices.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 bg-white hover:bg-black/5 text-sm"
            >
              <RefreshCcw size={14} /> Refresh
            </button>
            <Link
              href="/zero-control/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ink)] text-white text-sm font-semibold"
            >
              <Plus size={14} /> New Invoice
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Total Revenue</p>
            <p className="text-xl font-semibold mt-2">{money("₹", stats?.totalRevenue ?? 0)}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Pending</p>
            <p className="text-xl font-semibold mt-2">{money("₹", stats?.pendingAmount ?? 0)}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Overdue / Awaiting Sign</p>
            <p className="text-xl font-semibold mt-2">{stats?.awaitingSignature ?? 0}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Paid This Month</p>
            <p className="text-xl font-semibold mt-2">{money("₹", stats?.paidThisMonth ?? 0)}</p>
          </article>
        </div>
      </header>

      <section className="soft-card p-6">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_180px_180px]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | InvoiceStatus)}
            className="field py-2.5"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="SIGNED">Signed</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by client, email, invoice number"
            className="field py-2.5"
          />

          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="field py-2.5" />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="field py-2.5" />
        </div>

        {loading ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-[var(--muted)] mt-4">
            No invoices found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 text-left">Invoice #</th>
                  <th className="py-3 text-left">Client</th>
                  <th className="py-3 text-left">Business</th>
                  <th className="py-3 text-left">Amount</th>
                  <th className="py-3 text-left">Status</th>
                  <th className="py-3 text-left">Due Date</th>
                  <th className="py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 font-semibold">{row.invoiceNumber}</td>
                    <td className="py-3">
                      <p className="font-medium">{row.clientName}</p>
                      <p className="text-xs text-[var(--muted)]">{row.clientEmail}</p>
                    </td>
                    <td className="py-3">{row.clientBusiness}</td>
                    <td className="py-3">{money(row.currencySymbol || "₹", row.totalAmount)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyles[row.status]}`}>
                        {row.status === "VIEWED" ? <Eye size={12} /> : null}
                        {row.status}
                        {row.status === "VIEWED" ? ` (${row.viewCount || 0})` : ""}
                      </span>
                    </td>
                    <td className="py-3">{new Date(row.dueDate).toLocaleDateString("en-IN")}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/zero-control/invoices/${row.id}`} className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-xs">
                          Edit
                        </Link>
                        <Link href={`/zero-control/invoices/${row.id}/view`} className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-xs">
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => void sendInvoice(row.id)}
                          disabled={sendingId === row.id}
                          className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 text-xs font-semibold disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          <Mail size={12} />
                          {sendingId === row.id ? "Sending" : "Send"}
                        </button>
                        <a
                          href={`/api/invoices/${row.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-xs inline-flex items-center gap-1"
                        >
                          <FileDown size={12} /> PDF
                        </a>
                      </div>
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

"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Loader2, MessageCircle, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";

type FollowUpStatus = "pending" | "sent" | "failed" | "cancelled";
type LeadStatus = "new" | "contacted" | "converted";
type FollowUpFilter = "all" | "high" | "not-contacted" | "due";

interface FollowUpRow {
  id: string;
  day: 0 | 1 | 3 | 5;
  channel: "email" | "whatsapp";
  status: FollowUpStatus;
  scheduledAt: string;
  sentAt?: string | null;
  lead: {
    id?: string;
    bookingId: string;
    name: string;
    email?: string;
    phone?: string;
    service: string;
    status: LeadStatus;
    createdAt?: string;
    followUpSentAt?: string | null;
  } | null;
}

function daysSince(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function buildFollowUpMessage(lead: FollowUpRow["lead"]): string {
  const safeLead = lead ?? {
    bookingId: "",
    name: "there",
    service: "",
    status: "new" as LeadStatus
  };
  const days = daysSince(safeLead.createdAt);
  const firstName = safeLead.name.split(" ")[0] || "there";
  return (
    `Hi ${firstName}! \u{1F44B}\n\n` +
    `This is ${
      safeLead.service ? `regarding your enquiry for *${safeLead.service}*` : "a follow-up"
    } from ZERO OPS.\n\n` +
    `We wanted to check if you had any questions or are ready to move forward.\n\n` +
    `${days >= 3 ? "We have an opening to prioritise your request this week.\n\n" : ""}` +
    `We're here to help! \u{1F680}\n` +
    `\u2014 ZERO OPS Team`
  );
}

function buildPriority(row: FollowUpRow) {
  const age = daysSince(row.lead?.followUpSentAt || row.lead?.createdAt || row.scheduledAt);
  if (row.lead?.status === "new") return "HIGH";
  if (age > 3) return "HIGH";
  if (age >= 1) return "MEDIUM";
  return "LOW";
}

function buildWhatsAppLink(phone: string | undefined, message: string) {
  const cleanPhone = String(phone ?? "").replace(/\D/g, "");
  if (!cleanPhone) return "#";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export default function SmartFollowUpsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [expandedId, setExpandedId] = useState("");
  const [activeFilter, setActiveFilter] = useState<FollowUpFilter>("all");
  const [mutatingLeadId, setMutatingLeadId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<FollowUpRow[]>("/api/admin/followups");
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load follow-up queue");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const sorted = [...rows].sort((left, right) => {
      const leftAge = daysSince(left.lead?.createdAt || left.scheduledAt);
      const rightAge = daysSince(right.lead?.createdAt || right.scheduledAt);
      return rightAge - leftAge;
    });

    return sorted.filter((row) => {
      const priority = buildPriority(row);
      const notContacted = row.lead?.status === "new";
      const due = daysSince(row.lead?.followUpSentAt || row.lead?.createdAt || row.scheduledAt) >= 3;

      if (activeFilter === "high") return priority === "HIGH";
      if (activeFilter === "not-contacted") return notContacted;
      if (activeFilter === "due") return due;
      return true;
    });
  }, [activeFilter, rows]);

  const urgentRows = useMemo(
    () =>
      [...rows]
        .filter((row) => daysSince(row.lead?.followUpSentAt || row.lead?.createdAt || row.scheduledAt) >= 3)
        .sort(
          (left, right) =>
            daysSince(right.lead?.followUpSentAt || right.lead?.createdAt || right.scheduledAt) -
            daysSince(left.lead?.followUpSentAt || left.lead?.createdAt || left.scheduledAt)
        ),
    [rows]
  );

  const markAsFollowedUp = async (leadId?: string) => {
    if (!leadId) return;
    setMutatingLeadId(leadId);
    try {
      await api.patch(`/api/admin/bookings/${leadId}`, { status: "contacted" });
      toast.success("Lead marked as followed up");
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark lead as followed up");
    } finally {
      setMutatingLeadId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">Smart Follow-up Engine</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Automated follow-up queue for leads and clients</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 bg-white text-sm"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["high", "High Priority"],
            ["not-contacted", "Not Contacted"],
            ["due", "Follow-up Due"]
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveFilter(id as FollowUpFilter)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                activeFilter === id ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-white border-black/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="soft-card p-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-[var(--muted)]">
            No follow-up tasks match this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 text-left">Client</th>
                  <th className="py-3 text-left">Service</th>
                  <th className="py-3 text-left">Days Since Contact</th>
                  <th className="py-3 text-left">Priority</th>
                  <th className="py-3 text-left">Action</th>
                  <th className="py-3 text-left">Send</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredRows.map((row) => {
                  const leadId = row.lead?.id;
                  const priority = buildPriority(row);
                  const message = buildFollowUpMessage(row.lead);
                  const expanded = expandedId === row.id;

                  return (
                    <tr key={row.id}>
                      <td className="py-3 align-top">
                        <p className="font-medium">{row.lead?.name || "Unknown lead"}</p>
                        <p className="text-xs text-[var(--muted)]">{row.lead?.bookingId || "-"}</p>
                      </td>
                      <td className="py-3 align-top">{row.lead?.service || "-"}</td>
                      <td className="py-3 align-top">{daysSince(row.lead?.followUpSentAt || row.lead?.createdAt || row.scheduledAt)}</td>
                      <td className="py-3 align-top">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                            priority === "HIGH"
                              ? "bg-red-100 text-red-700"
                              : priority === "MEDIUM"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {priority}
                        </span>
                      </td>
                      <td className="py-3 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? "" : row.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold"
                        >
                          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {expanded ? "Hide Message" : "Preview Message"}
                        </button>
                        {expanded ? (
                          <div className="mt-3 rounded-xl border border-black/10 bg-white/80 p-3 whitespace-pre-wrap text-xs leading-6">
                            {message}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={buildWhatsAppLink(row.lead?.phone, message)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold"
                          >
                            <MessageCircle size={12} /> Send via WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => void markAsFollowedUp(leadId)}
                            disabled={!leadId || mutatingLeadId === leadId}
                            className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold disabled:opacity-60"
                          >
                            Mark as Followed Up
                          </button>
                          {leadId ? (
                            <Link
                              href={"/zero-control/clients" as Route}
                              className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold"
                            >
                              Convert to Booking
                            </Link>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold text-[var(--muted)]">
                              Convert to Booking
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="soft-card p-6">
        <h2 className="text-xl font-display text-[var(--ink)]">Auto-schedule Queue</h2>
        <p className="text-sm text-[var(--muted)] mt-1">Leads that have not been followed up in 3+ days, sorted oldest first.</p>
        {urgentRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)] mt-4">No urgent follow-ups right now.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {urgentRows.map((row) => (
              <div key={`urgent-${row.id}`} className="rounded-xl border border-black/10 bg-white/70 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--ink)]">{row.lead?.name || "Unknown lead"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {row.lead?.service || "-"} • {daysSince(row.lead?.followUpSentAt || row.lead?.createdAt || row.scheduledAt)} days
                  </p>
                </div>
                <a
                  href={buildWhatsAppLink(row.lead?.phone, buildFollowUpMessage(row.lead))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold"
                >
                  <MessageCircle size={12} /> Send Now
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

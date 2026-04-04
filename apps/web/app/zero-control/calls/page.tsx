"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";

type CallStatus = "booked" | "confirmed" | "completed" | "cancelled";

interface CallBooking {
  id: string;
  name: string;
  email: string;
  timeSlot: string;
  status: CallStatus;
  reminderSentAt?: string | null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata"
  });
}

function buildReminderMessage(call: CallBooking) {
  const date = new Date(call.timeSlot);
  const prettyDate = Number.isNaN(date.getTime())
    ? "your scheduled slot"
    : `${date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata"
      })} at ${date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata"
      })}`;

  return `Hi ${call.name}, just a reminder about your call with ZERO OPS scheduled for ${prettyDate}. Looking forward to speaking with you! \u2014 ZERO OPS Team`;
}

function buildWhatsAppLink(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function CallBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CallBooking[]>([]);
  const [mutatingId, setMutatingId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CallBooking[]>("/api/admin/calls");
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load call bookings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return {
      today: rows.filter((row) => new Date(row.timeSlot).getTime() >= todayStart.getTime() && new Date(row.timeSlot).getDate() === todayStart.getDate()).length,
      week: rows.filter((row) => {
        const slot = new Date(row.timeSlot).getTime();
        return slot >= todayStart.getTime() && slot <= weekEnd.getTime();
      }).length,
      pending: rows.filter((row) => row.status === "booked").length,
      completed: rows.filter((row) => row.status === "completed").length
    };
  }, [rows]);

  const updateStatus = async (id: string, status: CallStatus) => {
    setMutatingId(id);
    try {
      await api.patch(`/api/admin/calls/${id}/status`, { status });
      toast.success(`Call marked ${status}`);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update call status");
    } finally {
      setMutatingId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">Call Bookings</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Scheduled calls and booking requests</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 bg-white text-sm"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Today's Calls</p>
            <p className="text-2xl font-display mt-2">{stats.today}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">This Week</p>
            <p className="text-2xl font-display mt-2">{stats.week}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Pending Confirmation</p>
            <p className="text-2xl font-display mt-2">{stats.pending}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Completed</p>
            <p className="text-2xl font-display mt-2">{stats.completed}</p>
          </article>
        </div>
      </header>

      <section className="soft-card p-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-[var(--muted)]">
            No scheduled calls found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 text-left">Client</th>
                  <th className="py-3 text-left">Date & Time</th>
                  <th className="py-3 text-left">Service</th>
                  <th className="py-3 text-left">Status</th>
                  <th className="py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((row) => {
                  const statusLabel =
                    row.status === "booked"
                      ? "Confirm?"
                      : row.status === "confirmed"
                        ? "Confirmed"
                        : row.status === "completed"
                          ? "Done"
                          : "Cancelled";

                  const statusClass =
                    row.status === "booked"
                      ? "bg-yellow-100 text-yellow-800"
                      : row.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : row.status === "completed"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-red-100 text-red-700";

                  return (
                    <tr key={row.id}>
                      <td className="py-3">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-[var(--muted)]">{row.email}</p>
                      </td>
                      <td className="py-3">{formatDateTime(row.timeSlot)}</td>
                      <td className="py-3">Strategy / Discovery Call</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void updateStatus(row.id, "confirmed")}
                            disabled={mutatingId === row.id || row.status === "confirmed"}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold disabled:opacity-60"
                          >
                            Confirm
                          </button>
                          <a
                            href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(
                              "Reschedule your ZERO OPS call"
                            )}&body=${encodeURIComponent(
                              `Hi ${row.name}, we need to reschedule your call. Please reply with a better time and we will confirm it right away.`
                            )}`}
                            className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold"
                          >
                            Reschedule
                          </a>
                          <button
                            type="button"
                            onClick={() => void updateStatus(row.id, "cancelled")}
                            disabled={mutatingId === row.id || row.status === "cancelled"}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <a
                            href={buildWhatsAppLink(buildReminderMessage(row))}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold"
                          >
                            <MessageCircle size={12} /> Send Reminder on WhatsApp
                          </a>
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
    </section>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { SiteHeader } from "../../../components/SiteHeader";
import { SiteFooter } from "../../../components/SiteFooter";
import { api } from "../../../lib/api";

type BookingLookup = {
  bookingId: string;
  status: "new" | "contacted" | "converted";
  service: string;
  proposalUrl?: string;
  createdAt: string;
  date: string;
};

const statusConfig: Record<BookingLookup["status"], { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-sky-100 text-sky-800"
  },
  contacted: {
    label: "Contacted",
    className: "bg-amber-100 text-amber-800"
  },
  converted: {
    label: "Converted",
    className: "bg-emerald-100 text-emerald-800"
  }
};

export default function BookingStatusPage() {
  const params = useParams<{ id: string }>();
  const paramId = decodeURIComponent(params?.id ?? "");

  const [lookupId, setLookupId] = useState(paramId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingLookup | null>(null);

  const canSearch = useMemo(() => lookupId.trim().length >= 4, [lookupId]);

  async function fetchBookingStatus(targetId: string) {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/api/bookings/status/${encodeURIComponent(targetId.trim())}`);
      setBooking(data);
    } catch (requestError: any) {
      setBooking(null);
      const message = requestError?.response?.data?.message ?? "Unable to find booking status.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!paramId) return;
    void fetchBookingStatus(paramId);
  }, [paramId]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextId = lookupId.trim();
    if (!nextId) return;
    window.location.href = `/booking-status/${encodeURIComponent(nextId)}`;
  }

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <section className="relative z-10 max-w-3xl mx-auto mt-8 pb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Booking Tracking</p>
        <h1 className="text-4xl md:text-5xl font-display text-[var(--ink)] mt-3">Check your booking status</h1>

        <div className="soft-card p-6 md:p-8 mt-8">
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Enter booking ID (example: BK-260325-ABC123)"
              className="field py-3 flex-1"
            />
            <button
              type="submit"
              disabled={!canSearch}
              className="btn-primary py-3 px-5 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <Search size={14} />
              Track
            </button>
          </form>

          {loading ? (
            <div className="mt-6 text-sm text-[var(--muted)] inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Loading booking status...
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          {booking ? (
            <div className="mt-6 rounded-xl border border-black/10 bg-white/70 p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Booking ID</p>
              <p className="text-xl font-semibold mt-1">{booking.bookingId}</p>

              <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--muted)]">Service</p>
                  <p className="font-medium text-[var(--ink)] mt-1">{booking.service}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Status</p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[booking.status].className}`}
                  >
                    {statusConfig[booking.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Created</p>
                  <p className="font-medium text-[var(--ink)] mt-1">
                    {new Date(booking.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Requested Date</p>
                  <p className="font-medium text-[var(--ink)] mt-1">{new Date(booking.date).toLocaleDateString()}</p>
                </div>
              </div>
              {booking.proposalUrl ? (
                <a
                  href={booking.proposalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-4 text-sm font-semibold underline"
                >
                  View generated proposal
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

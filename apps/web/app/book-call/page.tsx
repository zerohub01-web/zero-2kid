"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, PhoneCall } from "lucide-react";
import toast from "react-hot-toast";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

interface SlotItem {
  timeSlot: string;
  label: string;
  available: boolean;
}

interface SlotsResponse {
  date?: string;
  slots?: SlotItem[];
  fallback?: boolean;
  message?: string;
}

interface BookResponse {
  success?: boolean;
  fallback?: boolean;
  message?: string;
}

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatSlotTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Invalid slot";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  }).format(parsed);
}

function formatSlotDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Invalid slot";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(parsed);
}

function normalizeSlots(input: unknown): SlotItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const timeSlot = typeof row.timeSlot === "string" ? row.timeSlot.trim() : "";
      if (!timeSlot) return null;

      const parsed = new Date(timeSlot);
      if (Number.isNaN(parsed.getTime())) return null;

      const label = formatSlotTime(timeSlot);
      const available = typeof row.available === "boolean" ? row.available : true;

      return { timeSlot, label, available };
    })
    .filter((slot): slot is SlotItem => slot !== null);
}

export default function BookCallPage() {
  const [date, setDate] = useState(todayIsoDate());
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [success, setSuccess] = useState("");
  const [slotNotice, setSlotNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSlotNotice("");
      setSuccess("");

      try {
        const response = await fetch(`/internal/calls/slots?date=${encodeURIComponent(date)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        });

        const data = (await response.json().catch(() => ({}))) as SlotsResponse;
        if (!response.ok) {
          throw new Error(data?.message || "Unable to load call slots.");
        }

        const parsedSlots = normalizeSlots(data?.slots);
        if (!cancelled) {
          setSlots(parsedSlots);
          if (data?.fallback && data?.message) {
            setSlotNotice(data.message);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSlots([]);
          setSlotNotice("Unable to load slots right now. Please try again in a minute.");
          toast.error(error instanceof Error ? error.message : "Unable to load call slots.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    };

    void fetchSlots();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const availableCount = useMemo(() => slots.filter((slot) => slot.available).length, [slots]);

  const selectedSlotLabel = useMemo(() => {
    const match = slots.find((slot) => slot.timeSlot === selectedSlot);
    if (!match) return "None";
    return formatSlotDateTime(match.timeSlot);
  }, [slots, selectedSlot]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!selectedSlot) {
      toast.error("Please select a timeslot.");
      return;
    }

    if (form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    if (form.phone.replace(/[^\d]/g, "").length < 7) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    setBooking(true);
    setSuccess("");

    try {
      const response = await fetch("/internal/calls/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          timeSlot: selectedSlot
        })
      });

      const data = (await response.json().catch(() => ({}))) as BookResponse;
      if (!response.ok) {
        throw new Error(data?.message || "Unable to book call slot.");
      }

      const message = data?.message || "Call booked successfully.";
      setSuccess(message);
      toast.success(message);
      setSelectedSlot("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to book call slot.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <section className="relative z-10 max-w-5xl mx-auto mt-8 pb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Auto Call Scheduler</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Book your strategy call.</h1>
        <p className="text-sm md:text-base text-[var(--muted)] mt-4 max-w-2xl">
          Choose a live slot, avoid double bookings automatically, and share your mobile number for reminders.
        </p>

        <div className="soft-card p-6 md:p-8 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <label className="text-xs uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
              Select Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedSlot("");
              }}
              min={todayIsoDate()}
              className="field mt-2 py-3 max-w-xs"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">{availableCount} available slots</p>
            {slotNotice ? (
              <p className="mt-2 text-xs text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 max-w-xl">
                {slotNotice}
              </p>
            ) : null}

            <div className="mt-5">
              {loadingSlots ? (
                <div className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Loader2 size={14} className="animate-spin" />
                  Loading slots...
                </div>
              ) : slots.length > 0 ? (
                <div className="grid sm:grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.timeSlot}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.timeSlot)}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${
                        selectedSlot === slot.timeSlot
                          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                          : slot.available
                            ? "border-black/10 bg-white/80 text-[var(--ink)] hover:bg-black/5"
                            : "border-black/5 bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
                  No slots available for this date. Try another date or contact us on{" "}
                  <a href="https://wa.me/919746927368" className="underline font-semibold">
                    WhatsApp
                  </a>
                  .
                </div>
              )}
            </div>
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl border border-black/10 bg-white/80 p-5 space-y-3">
            <div className="inline-flex h-10 w-10 rounded-full items-center justify-center bg-[var(--ink)] text-white">
              <PhoneCall size={16} />
            </div>
            <h2 className="text-xl font-display text-[var(--ink)]">Reserve Slot</h2>

            <input
              required
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Full name"
              className="field py-3"
            />
            <input
              required
              value={form.phone}
              onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
              placeholder="Mobile number"
              className="field py-3"
            />

            <p className="text-xs text-[var(--muted)]">
              Selected slot: {selectedSlot ? selectedSlotLabel : "None"}
            </p>

            <button
              type="submit"
              disabled={booking || !selectedSlot}
              className="btn-primary w-full py-3 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {booking ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Booking...
                </>
              ) : (
                "Book Call"
              )}
            </button>

            {success ? (
              <p className="text-sm text-emerald-700 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                {success}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

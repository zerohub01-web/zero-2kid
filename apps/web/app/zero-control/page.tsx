"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import {
  BarChart,
  Loader2,
  CheckCircle,
  Trash2,
  Clock,
  Star,
  MessageSquare,
  Search
} from "lucide-react";
import toast from "react-hot-toast";

interface DashboardStats {
  totalBookings: number;
  revenue: number;
  growthPercent: number;
  highValueLeads: number;
  conversionRate: number;
}

type BookingStatus = "new" | "contacted" | "converted";
type LeadScore = "high" | "medium" | "low";
type ChatStatus = "new" | "engaged" | "converted";
type FollowUpStatus = "pending" | "sent" | "failed" | "cancelled";
type CallStatus = "booked" | "completed" | "cancelled";

interface BookingLead {
  _id: string;
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  service: string;
  budget?: number | null;
  quotedFee?: number | null;
  quotedAt?: string | null;
  message: string;
  score: LeadScore;
  status: BookingStatus;
  proposalUrl?: string;
  createdAt: string;
  ipAddress: string;
}

interface ChatMessage {
  direction: "inbound" | "outbound";
  source: "user" | "ai" | "system" | "admin";
  text: string;
  timestamp: string;
}

interface ChatConversation {
  id: string;
  phone: string;
  status: ChatStatus;
  lastMessage: string;
  lastMessageAt: string;
  messages: ChatMessage[];
}

interface FollowUpRow {
  id: string;
  day: 0 | 1 | 3 | 5;
  channel: "email" | "whatsapp";
  status: FollowUpStatus;
  sent: boolean;
  scheduledAt: string;
  sentAt?: string | null;
  lead: {
    bookingId: string;
    name: string;
    service: string;
  } | null;
}

interface CallBooking {
  id: string;
  name: string;
  email: string;
  timeSlot: string;
  status: CallStatus;
  reminderSentAt?: string | null;
}

const statusStyles: Record<BookingStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  contacted: "bg-amber-100 text-amber-800",
  converted: "bg-emerald-100 text-emerald-800"
};

const scoreStyles: Record<LeadScore, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low: "bg-slate-200 text-slate-700"
};

const chatStatusStyles: Record<ChatStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  engaged: "bg-amber-100 text-amber-800",
  converted: "bg-emerald-100 text-emerald-800"
};

const followUpStatusStyles: Record<FollowUpStatus, string> = {
  pending: "bg-sky-100 text-sky-800",
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700"
};

const callStatusStyles: Record<CallStatus, string> = {
  booked: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700"
};

export default function ZeroControlDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingLead[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | LeadScore>("all");
  const [mutatingBookingId, setMutatingBookingId] = useState("");
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatStatusFilter, setChatStatusFilter] = useState<"all" | ChatStatus>("all");
  const [chatPhoneSearch, setChatPhoneSearch] = useState("");
  const [activeChatId, setActiveChatId] = useState("");
  const [mutatingChatId, setMutatingChatId] = useState("");
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);
  const [callBookings, setCallBookings] = useState<CallBooking[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [callStatusFilter, setCallStatusFilter] = useState<"all" | CallStatus>("all");
  const [mutatingCallId, setMutatingCallId] = useState("");

  useEffect(() => {
    void fetchDashboardData();
    void fetchReviews();
    void fetchFollowUps();
  }, []);

  useEffect(() => {
    void fetchBookings(statusFilter, scoreFilter);
  }, [statusFilter, scoreFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchChats(chatStatusFilter, chatPhoneSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [chatStatusFilter, chatPhoneSearch]);

  useEffect(() => {
    void fetchCallBookings(callStatusFilter);
  }, [callStatusFilter]);

  const fetchDashboardData = async () => {
    try {
      const { data } = await api.get("/api/admin/analytics?filter=month");
      setStats(data.kpis);
    } catch {
      toast.error("Failed to load dashboard statistics");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data } = await api.get("/api/reviews/admin/all");
      setReviews(data.reviews || []);
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const fetchBookings = async (status: "all" | BookingStatus, score: "all" | LeadScore) => {
    setBookingsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (score !== "all") params.set("score", score);
      const query = params.toString();
      const { data } = await api.get(`/api/admin/bookings${query ? `?${query}` : ""}`);
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load booking leads");
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchChats = async (status: "all" | ChatStatus, phone: string) => {
    setChatLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (phone.trim()) params.set("phone", phone.trim());
      const query = params.toString();
      const { data } = await api.get(`/api/admin/chats${query ? `?${query}` : ""}`);
      const rows = Array.isArray(data) ? data : [];
      setChats(rows);
      setActiveChatId((previous) => {
        if (previous && rows.some((chat) => chat.id === previous)) return previous;
        return rows[0]?.id ?? "";
      });
    } catch {
      toast.error("Failed to load WhatsApp chats");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchFollowUps = async () => {
    setFollowUpsLoading(true);
    try {
      const { data } = await api.get("/api/admin/followups");
      setFollowUps(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load follow-up status.");
      setFollowUps([]);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  const fetchCallBookings = async (status: "all" | CallStatus) => {
    setCallsLoading(true);
    try {
      const query = status === "all" ? "" : `?status=${status}`;
      const { data } = await api.get(`/api/admin/calls${query}`);
      setCallBookings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load call bookings.");
      setCallBookings([]);
    } finally {
      setCallsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/api/reviews/admin/${id}/approve`);
      toast.success("Review approved");
      void fetchReviews();
    } catch {
      toast.error("Failed to approve review");
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api.delete(`/api/reviews/admin/${id}`);
      toast.success("Review deleted");
      void fetchReviews();
    } catch {
      toast.error("Failed to delete review");
    }
  };

  const updateLeadStatus = async (bookingId: string, nextStatus: BookingStatus) => {
    setMutatingBookingId(bookingId);
    try {
      await api.patch(`/api/admin/bookings/${bookingId}`, { status: nextStatus });
      toast.success(`Lead moved to ${nextStatus}`);
      setBookings((previous) =>
        previous.map((booking) => (booking._id === bookingId ? { ...booking, status: nextStatus } : booking))
      );
    } catch {
      toast.error("Failed to update lead status");
    } finally {
      setMutatingBookingId("");
    }
  };

  const sendFeeQuote = async (bookingId: string) => {
    const rawValue = quoteInputs[bookingId] ?? "";
    const quotedFee = Number(rawValue.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(quotedFee) || quotedFee <= 0) {
      toast.error("Enter a valid fee amount before sending.");
      return;
    }

    setMutatingBookingId(bookingId);
    try {
      await api.patch(`/api/admin/bookings/${bookingId}`, {
        quotedFee,
        sendQuote: true,
        status: "contacted"
      });
      toast.success("Fee quote sent to client email.");
      setBookings((previous) =>
        previous.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                quotedFee,
                quotedAt: new Date().toISOString(),
                status: booking.status === "new" ? "contacted" : booking.status
              }
            : booking
        )
      );
    } catch {
      toast.error("Failed to send fee quote.");
    } finally {
      setMutatingBookingId("");
    }
  };

  const deleteSpamLead = async (bookingId: string) => {
    if (!confirm("Delete this booking lead as spam?")) return;
    setMutatingBookingId(bookingId);
    try {
      await api.delete(`/api/admin/bookings/${bookingId}`);
      toast.success("Spam lead deleted");
      setBookings((previous) => previous.filter((booking) => booking._id !== bookingId));
    } catch {
      toast.error("Failed to delete booking lead");
    } finally {
      setMutatingBookingId("");
    }
  };

  const updateConversationStatus = async (chatId: string, nextStatus: ChatStatus) => {
    setMutatingChatId(chatId);
    try {
      await api.patch(`/api/admin/chats/${chatId}/status`, { status: nextStatus });
      toast.success(`Conversation moved to ${nextStatus}`);
      setChats((previous) =>
        previous.map((chat) => (chat.id === chatId ? { ...chat, status: nextStatus } : chat))
      );
    } catch {
      toast.error("Failed to update conversation status");
    } finally {
      setMutatingChatId("");
    }
  };

  const updateCallStatus = async (callId: string, nextStatus: CallStatus) => {
    setMutatingCallId(callId);
    try {
      await api.patch(`/api/admin/calls/${callId}/status`, { status: nextStatus });
      toast.success(`Call marked ${nextStatus}`);
      setCallBookings((previous) =>
        previous.map((call) => (call.id === callId ? { ...call, status: nextStatus } : call))
      );
    } catch {
      toast.error("Failed to update call status.");
    } finally {
      setMutatingCallId("");
    }
  };

  const filteredCountLabel = useMemo(() => {
    const statusPart = statusFilter === "all" ? "all-status" : statusFilter;
    const scorePart = scoreFilter === "all" ? "all-score" : scoreFilter;
    return `${bookings.length} (${statusPart}, ${scorePart})`;
  }, [bookings.length, scoreFilter, statusFilter]);

  const activeConversation = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats]
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-[var(--ink)]">Lead Automation Overview</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Live insights from your ZERO lead capture and conversion pipeline.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="soft-card p-6">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] font-bold">Total Leads</p>
          <h2 className="text-4xl font-display text-[var(--ink)] mt-2">{stats?.totalBookings || 0}</h2>
        </div>
        <div className="soft-card p-6">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] font-bold">High-Value Leads</p>
          <h2 className="text-4xl font-display text-[var(--ink)] mt-2">{stats?.highValueLeads || 0}</h2>
        </div>
        <div className="soft-card p-6">
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted)] font-bold">Conversion Rate</p>
          <h2 className="text-4xl font-display text-[var(--ink)] mt-2">{stats?.conversionRate || 0}%</h2>
          <p className="text-xs text-[var(--muted)] mt-2">
            Revenue Estimate: INR {stats?.revenue.toLocaleString() || 0}
          </p>
        </div>
      </div>

      <section className="soft-card p-8 min-h-[220px] flex flex-col items-center justify-center text-center bg-gray-50/50 border-dashed mb-8">
        <BarChart size={48} className="text-[var(--muted)]/30 mb-4" />
        <h3 className="text-xl font-display text-[var(--ink)]">Advanced Charting</h3>
        <p className="text-sm text-[var(--muted)] max-w-sm mt-2">
          Switch to{" "}
          <span
            className="font-bold underline cursor-pointer"
            onClick={() => (window.location.href = "/zero-control/analytics")}
          >
            Deep Analytics
          </span>{" "}
          for hourly and daily trend visualization.
        </p>
      </section>

      <section className="soft-card p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-display text-[var(--ink)]">Lead Inbox</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Filter by status and score, review proposals, and update lead pipeline status.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">{filteredCountLabel}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "new", "contacted", "converted"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                statusFilter === status
                  ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                  : "bg-white/80 border-black/10 text-[var(--ink)] hover:bg-black/5"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "high", "medium", "low"] as const).map((score) => (
            <button
              key={score}
              onClick={() => setScoreFilter(score)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                scoreFilter === score
                  ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                  : "bg-white/80 border-black/10 text-[var(--ink)] hover:bg-black/5"
              }`}
            >
              {score}
            </button>
          ))}
        </div>

        {bookingsLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--muted)]">
            No leads found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Lead</th>
                  <th className="py-3 pr-4 font-semibold">Service & Fee</th>
                  <th className="py-3 pr-4 font-semibold">Message</th>
                  <th className="py-3 pr-4 font-semibold">Score</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Proposal</th>
                  <th className="py-3 pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="py-4 pr-4 align-top">
                      <p className="font-semibold text-[var(--ink)]">{booking.name}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{booking.email}</p>
                      <p className="text-xs text-[var(--muted)]">{booking.phone}</p>
                      <p className="text-[11px] text-[var(--muted)] mt-1">ID: {booking.bookingId}</p>
                      <p className="text-[11px] text-[var(--muted)]">IP: {booking.ipAddress || "Unknown"}</p>
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <p className="font-medium text-[var(--ink)]">{booking.service}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{booking.businessType}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Client Budget: Not requested
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Admin Fee:{" "}
                        {typeof booking.quotedFee === "number"
                          ? `INR ${booking.quotedFee.toLocaleString()}`
                          : "Pending quote"}
                      </p>
                    </td>
                    <td className="py-4 pr-4 align-top text-xs text-[var(--ink)] max-w-[260px]">
                      <p className="line-clamp-4">{booking.message}</p>
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          scoreStyles[booking.score]
                        }`}
                      >
                        {booking.score}
                      </span>
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          statusStyles[booking.status]
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 align-top text-xs">
                      {booking.proposalUrl ? (
                        <a
                          href={booking.proposalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--ink)] font-semibold underline"
                        >
                          View Proposal
                        </a>
                      ) : (
                        <span className="text-[var(--muted)]">Pending</span>
                      )}
                    </td>
                    <td className="py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={quoteInputs[booking._id] ?? ""}
                          onChange={(event) =>
                            setQuoteInputs((previous) => ({
                              ...previous,
                              [booking._id]: event.target.value
                            }))
                          }
                          placeholder="Fee (INR)"
                          className="field py-1.5 px-2.5 text-xs min-w-[120px]"
                        />
                        <button
                          onClick={() => sendFeeQuote(booking._id)}
                          disabled={mutatingBookingId === booking._id}
                          className="px-3 py-1.5 rounded-md bg-sky-100 text-sky-800 text-xs font-semibold hover:bg-sky-200 transition disabled:opacity-60"
                        >
                          Send Quote
                        </button>
                        {booking.status === "new" ? (
                          <button
                            onClick={() => updateLeadStatus(booking._id, "contacted")}
                            disabled={mutatingBookingId === booking._id}
                            className="px-3 py-1.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200 transition disabled:opacity-60"
                          >
                            Mark Contacted
                          </button>
                        ) : null}
                        {booking.status !== "converted" ? (
                          <button
                            onClick={() => updateLeadStatus(booking._id, "converted")}
                            disabled={mutatingBookingId === booking._id}
                            className="px-3 py-1.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold hover:bg-emerald-200 transition disabled:opacity-60"
                          >
                            Mark Converted
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteSpamLead(booking._id)}
                          disabled={mutatingBookingId === booking._id}
                          className="px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-100 text-xs font-semibold hover:bg-red-100 transition disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Delete Spam
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="soft-card p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-display text-[var(--ink)]">WhatsApp Conversations</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Track inbound messages, AI replies, and conversation status in one place.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">{chats.length} conversations</span>
        </div>

        <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3 mb-4">
          <label className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={chatPhoneSearch}
              onChange={(event) => setChatPhoneSearch(event.target.value)}
              placeholder="Search by phone number"
              className="field py-2.5 pl-9"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "new", "engaged", "converted"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setChatStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  chatStatusFilter === status
                    ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                    : "bg-white/80 border-black/10 text-[var(--ink)] hover:bg-black/5"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {chatLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--muted)]">
            No WhatsApp conversations found for this filter.
          </div>
        ) : (
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
            <aside className="rounded-xl border border-black/10 bg-white/70 max-h-[520px] overflow-y-auto">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left p-4 border-b border-black/5 transition ${
                    activeChatId === chat.id ? "bg-black/[0.03]" : "hover:bg-black/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-[var(--ink)]">{chat.phone}</p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        chatStatusStyles[chat.status]
                      }`}
                    >
                      {chat.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2">{chat.lastMessage || "No messages yet"}</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleString() : "-"}
                  </p>
                </button>
              ))}
            </aside>

            <div className="rounded-xl border border-black/10 bg-white/70 p-5">
              {activeConversation ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/10">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Conversation</p>
                      <h3 className="text-lg font-semibold text-[var(--ink)] mt-1">{activeConversation.phone}</h3>
                    </div>
                    <div className="flex gap-2">
                      {(["new", "engaged", "converted"] as const).map((nextStatus) => (
                        <button
                          key={nextStatus}
                          onClick={() => updateConversationStatus(activeConversation.id, nextStatus)}
                          disabled={
                            mutatingChatId === activeConversation.id || activeConversation.status === nextStatus
                          }
                          className="px-3 py-1.5 rounded-md text-xs font-semibold border border-black/10 bg-white hover:bg-black/5 disabled:opacity-50"
                        >
                          Mark {nextStatus}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activeConversation.messages.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No messages available.</p>
                    ) : (
                      activeConversation.messages.map((message, index) => (
                        <div
                          key={`${message.timestamp}-${index}`}
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                            message.direction === "inbound"
                              ? "bg-white border border-black/10 text-[var(--ink)]"
                              : "ml-auto bg-[var(--ink)] text-white"
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-[0.08em] opacity-70">
                            {message.direction === "inbound" ? "Client" : `ZERO (${message.source})`}
                          </p>
                          <p className="mt-1 leading-relaxed whitespace-pre-wrap">{message.text}</p>
                          <p className="mt-1 text-[10px] opacity-70">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center">
                  <MessageSquare className="text-[var(--muted)] mb-3" />
                  <p className="text-sm text-[var(--muted)]">Select a conversation to view message history.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="soft-card p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-display text-[var(--ink)]">Smart Follow-up Engine</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Day 0, Day 1, Day 3, and Day 5 automation status for each lead.
            </p>
          </div>
          <button onClick={() => fetchFollowUps()} className="btn-secondary px-3 py-1.5 text-xs">
            Refresh
          </button>
        </div>

        {followUpsLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : followUps.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--muted)]">
            No follow-up tasks found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Lead</th>
                  <th className="py-3 pr-4 font-semibold">Day</th>
                  <th className="py-3 pr-4 font-semibold">Channel</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Scheduled</th>
                  <th className="py-3 pr-4 font-semibold">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {followUps.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[var(--ink)]">{item.lead?.name ?? "Unknown lead"}</p>
                      <p className="text-xs text-[var(--muted)]">{item.lead?.bookingId ?? "-"}</p>
                    </td>
                    <td className="py-3 pr-4">Day {item.day}</td>
                    <td className="py-3 pr-4 uppercase text-xs font-semibold">{item.channel}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          followUpStatusStyles[item.status]
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                      {new Date(item.scheduledAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                      {item.sentAt ? new Date(item.sentAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="soft-card p-6 md:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-display text-[var(--ink)]">Call Bookings</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Track scheduled calls, reminder status, and conversion call outcomes.
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "booked", "completed", "cancelled"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setCallStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  callStatusFilter === status
                    ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                    : "bg-white/80 border-black/10 text-[var(--ink)] hover:bg-black/5"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {callsLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : callBookings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--muted)]">
            No call bookings for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Contact</th>
                  <th className="py-3 pr-4 font-semibold">Time Slot</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Reminder</th>
                  <th className="py-3 pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {callBookings.map((call) => (
                  <tr key={call.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[var(--ink)]">{call.name}</p>
                      <p className="text-xs text-[var(--muted)]">{call.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                      {new Date(call.timeSlot).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          callStatusStyles[call.status]
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                      {call.reminderSentAt ? "Sent" : "Pending"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCallStatus(call.id, "completed")}
                          disabled={mutatingCallId === call.id || call.status === "completed"}
                          className="px-3 py-1.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold hover:bg-emerald-200 transition disabled:opacity-60"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => updateCallStatus(call.id, "cancelled")}
                          disabled={mutatingCallId === call.id || call.status === "cancelled"}
                          className="px-3 py-1.5 rounded-md bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display text-[var(--ink)]">Review Management</h2>
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">{reviews.length} total reviews</span>
        </div>

        {isReviewsLoading ? (
          <div className="flex h-32 items-center justify-center soft-card">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="soft-card p-10 text-center text-[var(--muted)] text-sm italic">No reviews submitted yet.</div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <div key={review._id} className="soft-card p-5 flex flex-wrap md:flex-nowrap items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-[var(--ink)]">{review.clientName}</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          className={index < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    {review.approved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-bold uppercase">
                        <CheckCircle size={10} /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 font-bold uppercase">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--ink)] leading-relaxed italic border-l-2 border-black/5 pl-4 py-1">
                    "{review.testimonial}"
                  </p>
                </div>

                <div className="flex gap-2">
                  {!review.approved ? (
                    <button
                      onClick={() => handleApprove(review._id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDeleteReview(review._id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

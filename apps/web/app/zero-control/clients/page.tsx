"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { Loader2, User, Phone, Mail, Building, Briefcase, Calendar, Check, X, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface Booking {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  budgetRange?: string;
  service: string;
  currentWorkflow?: string;
  date: string;
  status: "new" | "contacted" | "converted" | "closed" | "NEW" | "CONFIRMED" | "COMPLETED";
  createdAt: string;
}

interface MilestoneComment {
  text: string;
  by: string;
  at: string;
}

interface Milestone {
  key: "planned" | "in_progress" | "delivered";
  title: string;
  status: "PENDING" | "DONE";
  files: string[];
  comments: MilestoneComment[];
}

const normalizeStatus = (status: Booking["status"]) => {
  if (status === "NEW") return "new";
  if (status === "CONFIRMED") return "contacted";
  if (status === "COMPLETED" || status === "closed") return "converted";
  return status;
};

const getBookingId = (booking: Booking | null | undefined): string => {
  return String(booking?._id ?? booking?.id ?? "").trim();
};

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  const responseData = (error as any)?.response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message.trim();
  if (typeof responseData?.error === "string" && responseData.error.trim()) return responseData.error.trim();
  return fallback;
};

async function patchWithFallback(paths: string[], payload: Record<string, unknown>) {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await api.patch(path, payload);
    } catch (error) {
      lastError = error;
      const status = (error as any)?.response?.status;
      if (status && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("No matching endpoint found");
}

export default function AdminClientsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    void fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/api/admin/bookings");
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Failed to load clients/bookings"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookingDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setIsLoading(true);
    try {
      const { data } = await api.get("/api/admin/projects");
      const bookingId = getBookingId(booking);
      const project = Array.isArray(data)
        ? data.find((row: any) => String(row?.bookingId ?? "") === String(bookingId))
        : null;
      setMilestones(Array.isArray(project?.milestones) ? project.milestones : []);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Failed to load project timeline details"));
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: "new" | "contacted" | "converted") => {
    if (!selectedBooking) return;

    const bookingId = getBookingId(selectedBooking);
    if (!bookingId) {
      toast.error("Booking ID is missing for this client.");
      return;
    }

    setIsUpdating(true);
    try {
      await patchWithFallback([`/api/admin/bookings/${bookingId}`, `/api/admin/leads/${bookingId}`], { status });

      toast.success(`Booking status changed to ${status}`);
      setSelectedBooking((previous) => (previous ? { ...previous, status } : previous));
      setBookings((previous) =>
        previous.map((row) => (getBookingId(row) === bookingId ? { ...row, status } : row))
      );
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Failed to update status"));
    } finally {
      setIsUpdating(false);
    }
  };

  const postComment = async (milestoneKey: string) => {
    const commentText = commentInputs[milestoneKey]?.trim();
    if (!selectedBooking || !commentText) return;

    const bookingId = getBookingId(selectedBooking);
    if (!bookingId) {
      toast.error("Booking ID is missing for this client.");
      return;
    }

    setIsUpdating(true);
    try {
      await patchWithFallback(
        [
          `/api/admin/projects/${bookingId}/milestones/${milestoneKey}`,
          `/api/admin/project-timelines/${bookingId}/milestones/${milestoneKey}`
        ],
        { comment: commentText }
      );
      toast.success("Comment sent to client");
      setCommentInputs((prev) => ({ ...prev, [milestoneKey]: "" }));
      await loadBookingDetails(selectedBooking);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Failed to post comment"));
    } finally {
      setIsUpdating(false);
    }
  };

  const markMilestoneDone = async (milestoneKey: string, currentStatus: string) => {
    if (!selectedBooking) return;

    const bookingId = getBookingId(selectedBooking);
    if (!bookingId) {
      toast.error("Booking ID is missing for this client.");
      return;
    }

    const newStatus = currentStatus === "PENDING" ? "DONE" : "PENDING";
    setIsUpdating(true);
    try {
      await patchWithFallback(
        [
          `/api/admin/projects/${bookingId}/milestones/${milestoneKey}`,
          `/api/admin/project-timelines/${bookingId}/milestones/${milestoneKey}`
        ],
        { status: newStatus }
      );
      toast.success(`Milestone marked as ${newStatus}`);
      await loadBookingDetails(selectedBooking);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Failed to update milestone"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && bookings.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (selectedBooking) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <button
              onClick={() => setSelectedBooking(null)}
              className="text-sm text-[var(--muted)] hover:text-black mb-2 flex items-center gap-1"
            >
              &larr; Back to Client List
            </button>
            <h1 className="text-3xl font-display text-[var(--ink)]">{selectedBooking.name}</h1>
            <p className="text-sm text-[var(--muted)]">
              {selectedBooking.businessType} - Requested{" "}
              {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleDateString() : "-"}
            </p>
          </div>
          <div className="flex gap-2">
            {normalizeStatus(selectedBooking.status) === "new" && (
              <>
                <button
                  onClick={() => updateStatus("contacted")}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-lg hover:bg-black/80 transition flex items-center gap-2 disabled:opacity-60"
                >
                  <Check size={16} /> Accept Booking
                </button>
                <button
                  onClick={() => updateStatus("converted")}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition flex items-center gap-2 disabled:opacity-60"
                >
                  <X size={16} /> Reject/Close
                </button>
              </>
            )}
            {normalizeStatus(selectedBooking.status) === "contacted" && (
              <button
                onClick={() => updateStatus("converted")}
                disabled={isUpdating}
                className="px-4 py-2 border border-green-200 text-green-700 bg-green-50 text-sm font-medium rounded-lg transition flex items-center gap-2 disabled:opacity-60"
              >
                <Check size={16} /> Mark Project Delivered
              </button>
            )}
            {normalizeStatus(selectedBooking.status) === "converted" && (
              <span className="px-4 py-2 bg-gray-100 text-[var(--muted)] text-sm font-medium rounded-lg">Closed</span>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="soft-card p-6 h-fit space-y-4">
            <h3 className="font-semibold text-[var(--ink)] uppercase tracking-wider text-xs border-b pb-2 mb-4">
              Request Profile
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <User size={16} className="text-[var(--muted)]" /> {selectedBooking.name}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-[var(--muted)]" />{" "}
              <a href={`mailto:${selectedBooking.email}`} className="text-blue-600 hover:underline">
                {selectedBooking.email}
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-[var(--muted)]" /> {selectedBooking.phone}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building size={16} className="text-[var(--muted)]" /> {selectedBooking.businessType}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Briefcase size={16} className="text-[var(--muted)]" /> <b>{selectedBooking.service}</b>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-[var(--muted)]" /> Goal:{" "}
              {selectedBooking.date ? new Date(selectedBooking.date).toLocaleDateString() : "-"}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-[var(--muted)] uppercase">Client Workflow/Bottlenecks</p>
              <p className="text-sm mt-1 bg-gray-50 p-3 rounded border italic">
                "{selectedBooking.currentWorkflow || "No detail provided"}"
              </p>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-[var(--muted)] uppercase">Budget Range</p>
              <p className="font-medium mt-1">{selectedBooking.budgetRange || "Not specified"}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-display text-[var(--ink)] border-b pb-2">Client Pipeline & Feedback</h2>

            {milestones.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)] border border-dashed rounded-lg">
                <p>No timeline instantiated yet. Accept the booking to initialize the pipeline.</p>
              </div>
            ) : (
              milestones.map((m) => (
                <div key={m.key} className="soft-card p-6 relative overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${m.status === "DONE" ? "bg-green-500" : "bg-orange-400"}`}
                  />

                  <div className="flex justify-between items-start mb-4 pl-2">
                    <div>
                      <h3 className="font-semibold text-lg">{m.title}</h3>
                      <button
                        onClick={() => markMilestoneDone(m.key, m.status)}
                        className={`text-xs mt-1 ${
                          m.status === "DONE" ? "text-green-600" : "text-orange-500 hover:underline"
                        }`}
                      >
                        Status: {m.status} (Click to toggle)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pl-2 max-h-60 overflow-y-auto mb-4 bg-gray-50/50 p-4 rounded border">
                    {m.comments.length === 0 && (
                      <p className="text-xs text-[var(--muted)] italic">No instructions or messages yet</p>
                    )}
                    {m.comments.map((c, i) => (
                      <div
                        key={i}
                        className={`text-sm p-3 rounded-lg ${
                          c.by === "admin" ? "bg-[var(--ink)] text-white ml-8" : "bg-white border mr-8"
                        }`}
                      >
                        <div className="flex justify-between text-[10px] uppercase opacity-70 mb-1">
                          <span>{c.by === "admin" ? "You (Admin)" : "Client"}</span>
                          <span>{new Date(c.at).toLocaleString()}</span>
                        </div>
                        <p>{c.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pl-2 mt-2">
                    <input
                      type="text"
                      placeholder={`Send instruction or update to client regarding ${m.title}...`}
                      className="flex-1 text-sm px-3 py-2 border rounded-md focus:outline-none focus:border-[var(--ink)]"
                      value={commentInputs[m.key] ?? ""}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [m.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void postComment(m.key);
                      }}
                    />
                    <button
                      onClick={() => void postComment(m.key)}
                      disabled={!commentInputs[m.key]?.trim() || isUpdating}
                      className="px-4 bg-[var(--ink)] text-white rounded-md hover:bg-black/80 transition disabled:opacity-50 text-sm flex items-center justify-center"
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-[var(--ink)]">Client Requests</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Accept incoming service inquiries and engage in 2-way project tracking.
          </p>
        </div>
      </header>

      <div className="soft-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 border-b border-black/10">
            <tr>
              <th className="px-6 py-4 font-semibold text-[var(--ink)]">Client</th>
              <th className="px-6 py-4 font-semibold text-[var(--ink)]">Service Requested</th>
              <th className="px-6 py-4 font-semibold text-[var(--ink)]">Target Date</th>
              <th className="px-6 py-4 font-semibold text-[var(--ink)]">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--muted)]">
                  No pending client requests found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={getBookingId(b)}
                  className="hover:bg-black/5 transition group cursor-pointer"
                  onClick={() => void loadBookingDetails(b)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--ink)]">{b.name}</div>
                    <div className="text-[var(--muted)] text-xs mt-0.5">{b.businessType}</div>
                  </td>
                  <td className="px-6 py-4">{b.service}</td>
                  <td className="px-6 py-4">{b.date ? new Date(b.date).toLocaleDateString() : "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                        normalizeStatus(b.status) === "new"
                          ? "bg-blue-100 text-blue-800"
                          : normalizeStatus(b.status) === "contacted"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                      }`}
                    >
                      {normalizeStatus(b.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[var(--ink)] text-sm font-medium opacity-0 group-hover:opacity-100 transition underline">
                      Manage Pipeline &rarr;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

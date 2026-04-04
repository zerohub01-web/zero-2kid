"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";

type ReviewFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

interface ReviewRecord {
  id: string;
  _id: string;
  createdAt: string;
  publishedAt?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  clientName: string;
  clientEmail: string;
  clientBusiness?: string;
  serviceUsed?: string;
  rating: number;
  reviewText: string;
  testimonial: string;
  rejectReason?: string;
}

function formatDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata"
  });
}

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("ALL");
  const [mutatingId, setMutatingId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = filter === "ALL" ? "?limit=200" : `?status=${filter}&limit=200`;
      const { data } = await api.get<{ reviews?: ReviewRecord[] }>(`/api/reviews/admin/all${query}`);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [filter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((review) => review.status === "PENDING").length;
    const approved = reviews.filter((review) => review.status === "APPROVED").length;
    const rejected = reviews.filter((review) => review.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [reviews]);

  const moderateReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setMutatingId(id);
    try {
      await api.patch(`/api/reviews/${id}`, {
        status,
        rejectReason: status === "REJECTED" ? rejectReason[id] || "" : ""
      });
      toast.success(status === "APPROVED" ? "Review approved and published" : "Review rejected");
      setRejectingId("");
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update review");
    } finally {
      setMutatingId("");
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm("Delete this review permanently?")) return;
    setMutatingId(id);
    try {
      await api.delete(`/api/reviews/${id}`);
      toast.success("Review deleted");
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete review");
    } finally {
      setMutatingId("");
    }
  };

  return (
    <section className="space-y-6">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">Client Reviews</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Approve reviews before they go live on the website</p>
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
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Total Reviews</p>
            <p className="text-2xl font-display mt-2">{stats.total}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Pending Approval</p>
            <p className="text-2xl font-display mt-2">{stats.pending}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Approved & Live</p>
            <p className="text-2xl font-display mt-2">{stats.approved}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Rejected</p>
            <p className="text-2xl font-display mt-2">{stats.rejected}</p>
          </article>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === status ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-white border-black/10"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="soft-card h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--muted)]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="soft-card p-10 text-center text-sm text-[var(--muted)]">
          No reviews found for this filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => {
            const reviewId = review.id || review._id;
            return (
              <article key={reviewId} className="soft-card p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={`${reviewId}-${star}`}
                      size={18}
                      className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}
                    />
                  ))}
                </div>

                <p className="text-[var(--ink)] text-base leading-7">"{review.reviewText || review.testimonial}"</p>

                <div className="mt-5 text-sm text-[var(--muted)]">
                  <p className="font-semibold text-[var(--ink)]">{review.clientName}</p>
                  <p>
                    {[review.clientBusiness, review.serviceUsed].filter(Boolean).join(" · ") || review.clientEmail}
                  </p>
                  <p className="mt-1">Submitted: {formatDate(review.createdAt)}</p>
                  {review.status === "APPROVED" && review.publishedAt ? (
                    <p className="mt-1 text-emerald-700">Published: {formatDate(review.publishedAt)}</p>
                  ) : null}
                  {review.status === "REJECTED" && review.rejectReason ? (
                    <p className="mt-1 text-red-700">Reason: {review.rejectReason}</p>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void moderateReview(reviewId, "APPROVED")}
                    disabled={mutatingId === reviewId || review.status === "APPROVED"}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {"\u2713"} Approve & Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectingId(rejectingId === reviewId ? "" : reviewId)}
                    className="px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm font-semibold"
                  >
                    {"\u2717"} Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteReview(reviewId)}
                    disabled={mutatingId === reviewId}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-semibold disabled:opacity-60"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

                {rejectingId === reviewId ? (
                  <div className="mt-4 rounded-xl border border-black/10 bg-white/80 p-4">
                    <textarea
                      value={rejectReason[reviewId] || ""}
                      onChange={(event) => setRejectReason((prev) => ({ ...prev, [reviewId]: event.target.value }))}
                      placeholder="Optional rejection reason"
                      className="field min-h-[100px] py-2.5"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void moderateReview(reviewId, "REJECTED")}
                        disabled={mutatingId === reviewId}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId("")}
                        className="px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

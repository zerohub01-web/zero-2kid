"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "react-hot-toast";
import { FolderKanban, FolderOpen, LogOut, Mail, MessageSquare, RefreshCw, ShieldCheck, Star, UserRound } from "lucide-react";
import { SiteHeader } from "../../components/SiteHeader";
import type { CustomerProfile, CustomerProject } from "../../types/customer";

interface PortalContract {
  id: string;
  contractNumber: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "COMPLETED" | "CANCELLED";
  serviceType: string;
  createdAt: string;
  effectiveDate: string;
  clientSignedAt?: string;
}

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "PAID" | "OVERDUE" | "CANCELLED";
  totalAmount: number;
  currencySymbol: string;
  dueDate: string;
  createdAt: string;
}

type PortalProject = CustomerProject & {
  contract?: PortalContract | null;
  invoice?: PortalInvoice | null;
};

function statusTone(status: CustomerProject["status"]) {
  if (status === "COMPLETED" || status === "completed" || status === "closed" || status === "converted") return "text-emerald-700";
  if (status === "CONFIRMED" || status === "contacted") return "text-sky-700";
  return "text-amber-700";
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB");
}

function getContractStatusLabel(status: PortalContract["status"]): string {
  if (status === "SIGNED") return "\u2713 Signed";
  if (status === "SENT") return "Awaiting Signature";
  return status;
}

function getInvoiceStatusLabel(status: PortalInvoice["status"]): string {
  if (status === "PAID") return "\u2713 Paid";
  if (status === "SIGNED") return "\u2713 Accepted";
  if (status === "SENT") return "Pending Payment";
  return status;
}

export default function PortalPage() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [unseenDocs, setUnseenDocs] = useState(0);
  const [unseenByProject, setUnseenByProject] = useState<Record<string, number>>({});

  const recalculateUnseenDocs = useCallback((items: PortalProject[]) => {
    if (typeof window === "undefined") return;

    const nextByProject: Record<string, number> = {};
    let total = 0;

    for (const project of items) {
      let projectCount = 0;
      if (project.contract) {
        const seenKey = `seen_contract_${project.contract.id}`;
        if (!window.localStorage.getItem(seenKey)) projectCount += 1;
      }
      if (project.invoice) {
        const seenKey = `seen_invoice_${project.invoice.id}`;
        if (!window.localStorage.getItem(seenKey)) projectCount += 1;
      }
      nextByProject[project.id] = projectCount;
      total += projectCount;
    }

    setUnseenByProject(nextByProject);
    setUnseenDocs(total);
  }, []);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const [me, dashboard, reviewRes] = await Promise.all([
          api.get("/api/auth/me"),
          api.get("/api/portal/project").catch(async (error) => {
            if (error?.response?.status === 404) {
              return api.get("/api/auth/client-dashboard");
            }
            throw error;
          }),
          api.get("/api/reviews/mine")
        ]);

        const projectItems: PortalProject[] = Array.isArray(dashboard.data?.projects) ? dashboard.data.projects : [];

        setCustomer(me.data);
        setProjects(projectItems);
        recalculateUnseenDocs(projectItems);

        if (reviewRes.data.review) {
          setReviewRating(reviewRes.data.review.rating);
          setReviewText(reviewRes.data.review.testimonial);
          setHasExistingReview(true);
        }
      } catch (err: unknown) {
        const code = (err as { response?: { status?: number } })?.response?.status;
        if (code === 401) {
          window.location.href = "/client-login";
        } else {
          toast.error("Failed to load project data.");
          console.error("Portal Data Fetch Error:", err);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [recalculateUnseenDocs]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    recalculateUnseenDocs(projects);
  }, [projects, recalculateUnseenDocs]);

  function markDocSeen(type: "contract" | "invoice", id: string) {
    try {
      window.localStorage.setItem(`seen_${type}_${id}`, "true");
      recalculateUnseenDocs(projects);
    } catch {
      // no-op
    }
  }

  async function logout() {
    const loadingId = toast.loading("Logging out...");
    try {
      await api.post("/api/auth/logout");
      toast.success("Successfully logged out!", { id: loadingId });
      window.location.href = "/";
    } catch {
      toast.error("Logout endpoint unavailable. Redirecting...", { id: loadingId });
      window.location.href = "/";
    }
  }

  async function postComment(bookingId: string, milestoneKey: string) {
    const text = commentInputs[`${bookingId}-${milestoneKey}`]?.trim();
    if (!text) return;
    setPosting(`${bookingId}-${milestoneKey}`);
    try {
      await api.post(`/api/auth/projects/${bookingId}/milestones/${milestoneKey}/comment`, { comment: text });
      toast.success("Message sent!");
      setCommentInputs((prev) => ({ ...prev, [`${bookingId}-${milestoneKey}`]: "" }));
      void fetchData(true);
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setPosting(null);
    }
  }

  async function handleReviewSubmit() {
    if (reviewRating === 0 || !reviewText.trim()) {
      toast.error("Please provide both a rating and a testimonial.");
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post("/api/reviews", { rating: reviewRating, testimonial: reviewText });
      toast.success("Review submitted! It will appear publicly once approved.");
      setHasExistingReview(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to submit review.";
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader portalMode onLogout={logout} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-6 space-y-5">
        <section className="soft-card p-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display text-[var(--ink)]">Project Tracker</h1>
            <p className="text-[var(--muted)] mt-2">Track your milestones, admin messages, and project files.</p>
          </div>
          <div className="flex items-center gap-2">
            {unseenDocs > 0 ? <span className="new-badge">{unseenDocs} New</span> : null}
            <button onClick={() => void fetchData(true)} disabled={refreshing} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-black transition">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <section className="soft-card p-6 lg:sticky lg:top-28">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Account Details</p>
                <h2 className="text-2xl font-display text-[var(--ink)] mt-2">Client Profile</h2>
              </div>
              <button onClick={logout} className="btn-secondary flex items-center gap-1.5 hover-lift rounded-full px-4 py-2 text-sm">
                <LogOut size={14} /> Logout
              </button>
            </div>

            {loading ? (
              <div className="mt-4 grid gap-3">
                <div className="h-24 skeleton"></div>
                <div className="h-24 skeleton"></div>
                <div className="h-24 skeleton"></div>
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <article className="rounded-xl border border-black/10 bg-white/70 p-4">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--ink)] text-white/90">
                      <UserRound size={16} />
                    </div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mt-3">Client Name</p>
                    <p className="text-lg font-semibold text-[var(--ink)] mt-1">{customer?.name ?? "Client"}</p>
                  </article>

                  <article className="rounded-xl border border-black/10 bg-white/70 p-4">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--ink)] text-white/90">
                      <Mail size={16} />
                    </div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mt-3">Email</p>
                    <p className="text-sm text-[var(--ink)] mt-1 break-all">{customer?.email ?? "-"}</p>
                  </article>

                  <article className="rounded-xl border border-black/10 bg-white/70 p-4">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--ink)] text-white/90">
                      <FolderKanban size={16} />
                    </div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mt-3">Active Projects</p>
                    <p className="text-lg font-semibold text-[var(--ink)] mt-1">{projects.length}</p>
                  </article>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <ShieldCheck size={14} /> Session Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    <FolderKanban size={14} /> {projects.length} Live Project{projects.length === 1 ? "" : "s"}
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="space-y-4">
            {loading ? (
              <article className="soft-card p-5 space-y-4">
                <div className="w-1/4 h-3 skeleton mb-2"></div>
                <div className="w-1/2 h-8 skeleton mb-4"></div>
                <div className="w-32 h-4 skeleton"></div>
                <div className="mt-5 grid md:grid-cols-3 gap-3">
                  <div className="h-32 skeleton"></div>
                  <div className="h-32 skeleton"></div>
                </div>
              </article>
            ) : projects.length ? (
              projects.map((project) => (
                <article key={project.id} className="soft-card p-5">
                  <div className="mb-4 h-48 w-full rounded-lg overflow-hidden border border-black/10 bg-white/60 flex items-center justify-center">
                    {project.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/zero-logo.png" alt="ZeroOps" className="h-16 w-auto opacity-30" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4 mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{project.businessType || project.type}</p>
                      <h2 className="text-2xl font-display text-[var(--ink)] mt-2">{project.title}</h2>
                      {project.status ? <p className={`text-sm mt-2 font-semibold ${statusTone(project.status)}`}>{project.status}</p> : null}
                      {project.date ? (
                        <p className="text-sm text-[var(--muted)] mt-1">Date: {new Date(project.date).toLocaleDateString()}</p>
                      ) : (
                        <p className="text-sm text-[var(--muted)] mt-1">Date: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "-"}</p>
                      )}
                      {project.value ? <p className="text-sm text-[var(--muted)]">Value: {"\u20B9"}{project.value}</p> : null}
                      {project.result ? <p className="text-sm text-[var(--accent)] mt-2">{project.result}</p> : null}
                    </div>

                    {(project.files?.length ?? 0) > 0 ? (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Project Files</p>
                        <div className="mt-1 space-y-1">
                          {project.files?.map((file: string) => (
                            <a key={file} href={file} target="_blank" rel="noreferrer" className="block text-xs underline text-[var(--accent)] break-all">
                              {file}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {(project.contract || project.invoice) ? (
                    <div className="documents-section">
                      <h3 className="doc-section-title">
                        {"\u{1F4C4}"} Your Documents
                        {(unseenByProject[project.id] || 0) > 0 ? <span className="new-badge">{unseenByProject[project.id]} New</span> : null}
                      </h3>

                      {project.contract ? (
                        <div className="doc-card">
                          <div className="doc-card-left">
                            <span className="doc-icon">{"\u{1F4CB}"}</span>
                            <div>
                              <div className="doc-name">Service Agreement</div>
                              <div className="doc-meta">
                                {project.contract.contractNumber} | {formatDate(project.contract.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="doc-card-right">
                            <span className={`doc-status ${project.contract.status.toLowerCase()}`}>{getContractStatusLabel(project.contract.status)}</span>
                            <a href={`/portal/contract/${project.contract.id}`} onClick={() => markDocSeen("contract", project.contract!.id)} className="doc-action-btn">
                              {project.contract.status === "SIGNED" ? "View Signed Copy" : "Review & Sign ->"}
                            </a>
                          </div>
                        </div>
                      ) : null}

                      {project.invoice ? (
                        <div className="doc-card">
                          <div className="doc-card-left">
                            <span className="doc-icon">{"\u{1F9FE}"}</span>
                            <div>
                              <div className="doc-name">Invoice</div>
                              <div className="doc-meta">
                                {project.invoice.invoiceNumber} | {project.invoice.currencySymbol}
                                {Number(project.invoice.totalAmount || 0).toLocaleString("en-IN")} | Due {formatDate(project.invoice.dueDate)}
                              </div>
                            </div>
                          </div>
                          <div className="doc-card-right">
                            <span className={`doc-status ${project.invoice.status.toLowerCase()}`}>{getInvoiceStatusLabel(project.invoice.status)}</span>
                            <a href={`/portal/invoice/${project.invoice.id}`} onClick={() => markDocSeen("invoice", project.invoice!.id)} className="doc-action-btn">
                              {project.invoice.status === "PAID" ? "View Receipt" : "View & Pay ->"}
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-6 mt-6">
                    {project.milestones?.map((milestone) => (
                      <div key={milestone.key} className="rounded-xl border border-black/10 bg-white/65 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-[var(--ink)] uppercase tracking-[0.12em]">{milestone.title}</p>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              milestone.status === "DONE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {milestone.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mb-4">Last updated: {new Date(milestone.updatedAt).toLocaleString()}</p>

                        {milestone.files.length > 0 ? (
                          <div className="mb-4">
                            <p className="text-xs text-[var(--muted)] uppercase tracking-[0.12em] mb-1">Files</p>
                            <div className="space-y-1">
                              {milestone.files.map((file: string) => (
                                <a key={file} href={file} target="_blank" rel="noreferrer" className="block text-xs underline hover:text-[var(--ink)] text-[var(--accent)] break-all transition">
                                  {file}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="bg-gray-50/70 rounded-lg border p-3 space-y-2 max-h-56 overflow-y-auto mb-3">
                          {milestone.comments.length === 0 ? (
                            <p className="text-xs text-[var(--muted)] italic text-center py-2">No messages yet. Admin will provide updates here.</p>
                          ) : (
                            milestone.comments.map((comment, idx) => (
                              <div
                                key={`${comment.by}-${idx}`}
                                className={`text-sm p-3 rounded-lg max-w-[85%] ${
                                  comment.by === "client" ? "ml-auto bg-[var(--ink)] text-white" : "bg-white border border-black/10 text-[var(--ink)]"
                                }`}
                              >
                                <p className="text-[10px] opacity-60 mb-1 uppercase font-semibold">
                                  {comment.by === "client" ? "You" : "ZeroOps Team"} | {new Date(comment.at).toLocaleString()}
                                </p>
                                <p>{comment.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Reply to admin..."
                            className="flex-1 text-sm px-3 py-2 border rounded-md focus:outline-none focus:border-[var(--ink)]"
                            value={commentInputs[`${project.id}-${milestone.key}`] ?? ""}
                            onChange={(event) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [`${project.id}-${milestone.key}`]: event.target.value
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void postComment(project.id, milestone.key);
                            }}
                          />
                          <button
                            onClick={() => void postComment(project.id, milestone.key)}
                            disabled={!commentInputs[`${project.id}-${milestone.key}`]?.trim() || posting === `${project.id}-${milestone.key}`}
                            className="px-4 bg-[var(--ink)] text-white rounded-md hover:bg-black/80 transition disabled:opacity-50 text-sm"
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <article className="soft-card p-10 mt-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50/50 flex items-center justify-center text-[var(--accent)] mb-4 shadow-sm border border-blue-100/30">
                  <FolderOpen size={28} />
                </div>
                <h2 className="text-xl font-display text-[var(--ink)]">No Active Projects</h2>
                <p className="text-[var(--muted)] mt-2 max-w-sm">You have not booked any services yet. Start a project with us to see your timeline and milestones here.</p>
                <a href="/" className="mt-5 btn-primary hover-lift px-6 py-2.5 text-sm inline-block">
                  Start Project
                </a>
              </article>
            )}
          </section>
        </div>

        <section className="soft-card p-6 mt-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-display text-[var(--ink)]">{hasExistingReview ? "Edit your review" : "Leave a Review"}</h2>
            <p className="text-[var(--muted)] mt-2">How was your experience with ZeroOps? Your feedback helps us grow.</p>

            <div className="mt-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setReviewRating(star)} className="transition transform hover:scale-110 active:scale-95">
                  <Star size={32} className={star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                </button>
              ))}
            </div>

            <div className="mt-6 relative">
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value.slice(0, 500))}
                placeholder="Share your experience (max 500 characters)..."
                className="w-full h-32 p-4 rounded-xl border border-black/10 bg-white/65 focus:outline-none focus:ring-2 focus:ring-[var(--ink)] transition text-sm resize-none"
              />
              <span className="absolute bottom-3 right-3 text-[10px] text-[var(--muted)] font-mono">{reviewText.length}/500</span>
            </div>

            <button onClick={() => void handleReviewSubmit()} disabled={submittingReview} className="mt-6 btn-primary w-full py-3 rounded-xl disabled:opacity-50">
              {submittingReview ? <RefreshCw size={18} className="animate-spin mx-auto" /> : hasExistingReview ? "Update Review" : "Submit Review"}
            </button>
            <p className="text-[10px] text-[var(--muted)] mt-4 italic">* Approved reviews appear publicly on our homepage.</p>
          </div>
        </section>
      </div>

      <style jsx>{`
        .documents-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .doc-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
        }

        .doc-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 10px;
          margin-bottom: 10px;
          gap: 16px;
        }

        .doc-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .doc-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .doc-name {
          font-size: 14px;
          font-weight: 600;
          color: #111;
          margin-bottom: 2px;
        }

        .doc-meta {
          font-size: 11px;
          color: #888;
        }

        .doc-card-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .doc-status {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .doc-status.sent,
        .doc-status.viewed {
          background: #fff3e0;
          color: #e65100;
        }

        .doc-status.signed,
        .doc-status.paid,
        .doc-status.completed {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .doc-status.draft {
          background: #f5f5f5;
          color: #888;
        }

        .doc-status.cancelled,
        .doc-status.overdue {
          background: #ffebee;
          color: #b71c1c;
        }

        .doc-action-btn {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          background: #0a0a0f;
          color: #fff;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .doc-action-btn:hover {
          background: #333;
        }

        .new-badge {
          display: inline-flex;
          align-items: center;
          background: #d32f2f;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          margin-left: 8px;
          vertical-align: middle;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @media (max-width: 640px) {
          .doc-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .doc-card-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </main>
  );
}

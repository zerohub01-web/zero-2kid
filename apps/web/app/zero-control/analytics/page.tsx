"use client";

import { useEffect, useState } from "react";
import { Activity, DollarSign, Eye, Loader2, TrendingUp, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";

type AnalyticsFilter = "hour" | "today" | "week" | "month" | "all";

interface ActivityItem {
  _id: string;
  action: string;
  actionLabel?: string;
  performedBy?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  timestamp?: string;
}

interface AnalyticsStats {
  totalRequests: number;
  conversionRate: number;
  revenue: {
    amount: number;
    currency: string;
    symbol: string;
    growth: number;
  };
  activeUsers: number;
  topService: string;
}

interface AnalyticsResponse {
  stats?: AnalyticsStats;
  kpis?: {
    totalBookings: number;
    revenue: number;
    growthPercent: number;
    activeCustomers: number;
    conversionRate: number;
    topService: string;
  };
  recentActivity?: ActivityItem[];
}

const ACTION_LABELS: Record<string, string> = {
  ADMIN_LOGIN_CUSTOMER_BRIDGE: "Admin logged in",
  ASSET_UPLOADED: "Asset uploaded",
  BOOKING_CREATED: "New booking received",
  BOOKING_STATUS_CHANGED: "Booking status updated",
  CONTRACT_SENT: "Contract sent to client",
  CONTRACT_SIGNED: "Client signed contract",
  INVOICE_SENT: "Invoice sent to client",
  LEAD_CAPTURED: "New lead captured",
  LEAD_AUTOMATION_COMPLETED: "Lead automation completed",
  PROJECT_MILESTONE_UPDATED: "Project milestone updated",
  REVIEW_APPROVED: "Review approved",
  REVIEW_REJECTED: "Review rejected",
  REVIEW_SUBMITTED: "Review submitted"
};

const FILTERS: Array<{ id: AnalyticsFilter; label: string }> = [
  { id: "hour", label: "Hourly" },
  { id: "today", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "all", label: "All" }
];

const safeFormatDate = (val: any): string => {
  if (!val) return "Just now";
  try {
    const d =
      val instanceof Date
        ? val
        : typeof val === "number"
          ? new Date(val)
          : new Date(val.toString());

    if (Number.isNaN(d.getTime())) return "Recently";

    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    });
  } catch {
    return "Recently";
  }
};

function formatCurrency(amount: number, symbol = "\u20B9") {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function getActionFormat(action: string) {
  switch (action) {
    case "BOOKING_CREATED":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    case "BOOKING_STATUS_CHANGED":
      return { bg: "bg-orange-100", text: "text-orange-700" };
    case "PROJECT_MILESTONE_UPDATED":
      return { bg: "bg-purple-100", text: "text-purple-700" };
    case "INVOICE_SENT":
      return { bg: "bg-emerald-100", text: "text-emerald-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-700" };
  }
}

export default function AdminAnalyticsPage() {
  const [filter, setFilter] = useState<AnalyticsFilter>("today");
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchAnalytics();
  }, [filter]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data: analyticsData } = await api.get<AnalyticsResponse>(`/api/admin/analytics?filter=${filter}`);
      const normalizedStats: AnalyticsStats = analyticsData.stats ?? {
        totalRequests: analyticsData.kpis?.totalBookings ?? 0,
        conversionRate: analyticsData.kpis?.conversionRate ?? 0,
        revenue: {
          amount: analyticsData.kpis?.revenue ?? 0,
          currency: "INR",
          symbol: "\u20B9",
          growth: analyticsData.kpis?.growthPercent ?? 0
        },
        activeUsers: analyticsData.kpis?.activeCustomers ?? 0,
        topService: analyticsData.kpis?.topService ?? "None"
      };

      setStats(normalizedStats);

      if (Array.isArray(analyticsData.recentActivity)) {
        setActivities(analyticsData.recentActivity.slice(0, 20));
      } else {
        const { data: activityData } = await api.get<ActivityItem[]>("/api/admin/activity");
        setActivities(Array.isArray(activityData) ? activityData.slice(0, 20) : []);
      }
    } catch (error) {
      console.error("Analytics fetch failed:", error);
      toast.error("Failed to load live analytics data");
      setStats(null);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display text-[var(--ink)]">Analytics Dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Live traffic, revenue, and activity signals for your ZERO OPS workflows.
          </p>
        </div>
        <div className="flex bg-white/50 p-1 rounded-lg border border-black/10">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                filter === item.id ? "bg-[var(--ink)] text-white shadow-sm" : "text-[var(--muted)] hover:text-black"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading || !stats ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-[var(--muted)]" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="soft-card p-5">
              <div className="flex justify-between items-start">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Total Requests</p>
                <Activity size={16} className="text-[var(--muted)]" />
              </div>
              <h2 className="text-3xl font-display text-[var(--ink)] mt-2">{stats.totalRequests}</h2>
              <p className="text-xs text-[var(--accent)] mt-2">Conversion: {stats.conversionRate}%</p>
            </div>

            <div className="soft-card p-5">
              <div className="flex justify-between items-start">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Revenue Value</p>
                <DollarSign size={16} className="text-[var(--muted)]" />
              </div>
              <h2 className="text-3xl font-display text-[var(--ink)] mt-2">
                {formatCurrency(stats.revenue.amount, stats.revenue.symbol || "\u20B9")}
              </h2>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> {stats.revenue.growth > 0 ? "+" : ""}
                {stats.revenue.growth}% growth
              </p>
            </div>

            <div className="soft-card p-5">
              <div className="flex justify-between items-start">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Active Users</p>
                <Users size={16} className="text-[var(--muted)]" />
              </div>
              <h2 className="text-3xl font-display text-[var(--ink)] mt-2">{stats.activeUsers}</h2>
              <p className="text-xs text-[var(--muted)] mt-2">Unique client emails in the selected period</p>
            </div>

            <div className="soft-card p-5">
              <div className="flex justify-between items-start">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Top Service</p>
                <Eye size={16} className="text-[var(--muted)]" />
              </div>
              <h2 className="text-xl font-display text-[var(--ink)] mt-2 truncate" title={stats.topService}>
                {stats.topService || "None"}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-2 line-clamp-1">Most requested offering</p>
            </div>
          </div>

          <div className="soft-card">
            <div className="p-5 border-b border-black/10">
              <h3 className="font-semibold text-lg text-[var(--ink)]">Recent Activity</h3>
              <p className="text-xs text-[var(--muted)]">Readable system activity with safe timestamps</p>
            </div>
            <div className="p-0">
              {activities.length === 0 ? (
                <p className="p-5 text-center text-sm text-[var(--muted)]">No recent activity found.</p>
              ) : (
                <div className="divide-y divide-black/5">
                  {activities.map((activity) => {
                    const format = getActionFormat(activity.action);
                    const label =
                      activity.actionLabel ||
                      ACTION_LABELS[activity.action] ||
                      activity.action.replace(/_/g, " ");
                    const actor = activity.metadata?.clientName
                      ? `${activity.metadata.clientName} (${activity.userEmail || activity.performedBy || "system"})`
                      : activity.userEmail || activity.performedBy || "system";

                    return (
                      <div key={activity._id} className="p-4 flex items-center justify-between gap-3 hover:bg-black/5 transition">
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`${format.bg} ${format.text} px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase w-32 text-center`}
                          >
                            {label}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--ink)] font-medium truncate">{actor}</p>
                            <p className="text-xs text-[var(--muted)] truncate">
                              {activity.metadata?.service || activity.metadata?.status
                                ? `${activity.metadata?.service || ""} ${activity.metadata?.status ? `• ${activity.metadata.status}` : ""}`.trim()
                                : `Action: ${label}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                          {safeFormatDate(activity.createdAt || activity.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

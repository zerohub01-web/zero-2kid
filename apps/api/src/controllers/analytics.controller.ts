import { Request, Response } from "express";
import { InvoiceModel } from "../db/schema.js";
import { ActivityLogModel } from "../models/ActivityLog.js";
import { BookingModel, toCanonicalBookingStatus } from "../models/Booking.js";
import { serializeActivityLog } from "../services/activity.service.js";

type AnalyticsFilter = "hour" | "today" | "week" | "month" | "all";

function getDateRange(filter: AnalyticsFilter) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (filter) {
    case "hour":
      start.setHours(now.getHours() - 1, now.getMinutes(), 0, 0);
      break;
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "all":
    default:
      start.setFullYear(2020, 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  if (filter === "all") {
    return {
      start,
      end,
      previousStart: null,
      previousEnd: null
    };
  }

  const span = end.getTime() - start.getTime();
  const previousEnd = new Date(start);
  const previousStart = new Date(start.getTime() - span);

  return {
    start,
    end,
    previousStart,
    previousEnd
  };
}

function groupLabel(date: Date, filter: AnalyticsFilter) {
  if (filter === "hour") {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    });
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata"
  });
}

export async function getAnalytics(req: Request, res: Response) {
  const rawFilter = typeof req.query.filter === "string" ? req.query.filter : "today";
  const filter = (["hour", "today", "week", "month", "all"].includes(rawFilter) ? rawFilter : "today") as AnalyticsFilter;
  const range = getDateRange(filter);

  const bookingQuery = { createdAt: { $gte: range.start, $lte: range.end } };
  const invoiceQuery = { status: "PAID", createdAt: { $gte: range.start, $lte: range.end } };
  const previousInvoiceQuery =
    range.previousStart && range.previousEnd
      ? {
          status: "PAID",
          createdAt: {
            $gte: range.previousStart,
            $lt: range.previousEnd
          }
        }
      : null;

  const [bookings, paidInvoices, previousPaidInvoices, recentActivity] = await Promise.all([
    BookingModel.find(bookingQuery).sort({ createdAt: -1 }).lean(),
    InvoiceModel.find(invoiceQuery).select("totalAmount").lean(),
    previousInvoiceQuery ? InvoiceModel.find(previousInvoiceQuery).select("totalAmount").lean() : Promise.resolve([]),
    ActivityLogModel.find().sort({ timestamp: -1 }).limit(20)
  ]);

  const totalRequests = bookings.length;
  const activeUsers = new Set(
    bookings.map((booking) => String(booking.email ?? "").trim().toLowerCase()).filter(Boolean)
  ).size;
  const repeatCustomers = Math.max(
    0,
    bookings.length -
      new Set(bookings.map((booking) => String(booking.email ?? "").trim().toLowerCase()).filter(Boolean)).size
  );
  const highValueLeads = bookings.filter((booking) => booking.score === "high").length;
  const convertedLeads = bookings.filter(
    (booking) => (toCanonicalBookingStatus(String(booking.status ?? "")) ?? "new") === "converted"
  ).length;
  const conversionRate = totalRequests > 0 ? Math.round((convertedLeads / totalRequests) * 100) : 0;

  const serviceCount = new Map<string, number>();
  for (const booking of bookings) {
    const service = String(booking.service ?? "").trim() || "Unknown";
    serviceCount.set(service, (serviceCount.get(service) ?? 0) + 1);
  }

  const topService =
    [...serviceCount.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "None";

  const currentRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
  const previousRevenue = previousPaidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
  const revenueGrowth =
    previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0;

  const bookingsOverTimeMap = new Map<string, number>();
  for (const booking of bookings) {
    const createdAt = booking.createdAt instanceof Date ? booking.createdAt : new Date(booking.createdAt);
    const label = groupLabel(createdAt, filter);
    bookingsOverTimeMap.set(label, (bookingsOverTimeMap.get(label) ?? 0) + 1);
  }

  return res.json({
    period: filter,
    stats: {
      totalRequests,
      conversionRate,
      revenue: {
        amount: currentRevenue,
        currency: "INR",
        symbol: "\u20B9",
        growth: revenueGrowth
      },
      activeUsers,
      topService
    },
    kpis: {
      totalBookings: totalRequests,
      revenue: currentRevenue,
      growthPercent: revenueGrowth,
      activeCustomers: activeUsers,
      highValueLeads,
      conversionRate,
      repeatCustomers,
      topService
    },
    recentActivity: recentActivity.map((item) => serializeActivityLog(item)),
    charts: {
      bookingsOverTime: [...bookingsOverTimeMap.entries()].map(([label, count]) => ({
        label,
        count
      })),
      servicePerformance: [...serviceCount.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([service, count]) => ({ service, count }))
    }
  });
}

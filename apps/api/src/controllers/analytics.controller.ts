import { Request, Response } from "express";
import { BookingModel, toCanonicalBookingStatus } from "../models/Booking.js";

function startOfHour() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  return date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const diff = date.getDate() - day;
  date.setDate(diff);
  return date;
}

function startOfPrevMonth() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  date.setHours(0,0,0,0);
  return date;
}

export async function getAnalytics(req: Request, res: Response) {
  const filter = (req.query.filter as string) || "month";
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  let startDate = new Date();
  const endDate = new Date();

  // Handle various filter granularities as requested by user
  switch (filter) {
    case "hour":
      startDate = startOfHour();
      break;
    case "today":
      startDate = startOfToday();
      break;
    case "week":
      startDate = startOfWeek();
      break;
    case "month":
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0,0,0,0);
      break;
    case "all":
      startDate = new Date(0);
      break;
    case "custom":
      if (from && to) {
        startDate = new Date(from);
        endDate.setTime(new Date(to).getTime());
      }
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1);
  }

  const bookings = await BookingModel.find({ createdAt: { $gte: startDate, $lte: endDate } });
  
  // Growth calculation (compare to previous period of same duration)
  const duration = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - duration);
  const prevBookings = await BookingModel.find({ createdAt: { $gte: prevStart, $lt: startDate } });

  const totalBookings = bookings.length;
  const revenue = bookings.reduce((sum, b) => sum + (b.servicePriceSnapshot || 0), 0);
  const prevRevenue = prevBookings.reduce((sum, b) => sum + (b.servicePriceSnapshot || 0), 0);
  const growthPercent = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  const emails = bookings.map((b) => b.email);
  const uniqueEmails = new Set(emails);
  const repeatCustomers = emails.length - uniqueEmails.size;
  const convertedLeads = bookings.filter(
    (booking) => (toCanonicalBookingStatus(booking.status) ?? "new") === "converted"
  ).length;
  const highValueLeads = bookings.filter((booking) => booking.score === "high").length;
  const conversionRate = totalBookings > 0 ? (convertedLeads / totalBookings) * 100 : 0;

  const serviceCount = new Map<string, number>();
  bookings.forEach((b) => serviceCount.set(b.service, (serviceCount.get(b.service) ?? 0) + 1));
  const topService = [...serviceCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";

  // Aggregate stats for charts based on granularity
  const timeKey = filter === "hour" ? "minutes" : "date";

  return res.json({
    kpis: {
      totalBookings,
      revenue,
      growthPercent: Number(growthPercent.toFixed(1)),
      activeCustomers: uniqueEmails.size,
      highValueLeads,
      conversionRate: Number(conversionRate.toFixed(1)),
      repeatCustomers,
      topService
    },
    charts: {
      bookingsOverTime: bookings.map((b) => ({ 
        label: new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        count: 1 
      })),
      servicePerformance: [...serviceCount.entries()].map(([service, count]) => ({ service, count }))
    }
  });
}

import { Request, Response } from "express";
import { BookingModel } from "../models/Booking.js";
import { sanitizeEmail, sanitizePhone } from "../utils/sanitize.js";

export async function getLeadMemory(req: Request, res: Response) {
  const emailRaw = typeof req.query.email === "string" ? req.query.email : "";
  const phoneRaw = typeof req.query.phone === "string" ? req.query.phone : "";

  const email = sanitizeEmail(emailRaw);
  const phone = sanitizePhone(phoneRaw);

  if (!email && !phone) {
    return res.status(400).json({ message: "Email or phone is required." });
  }

  const filter: Record<string, unknown>[] = [];
  if (email) filter.push({ email });
  if (phone) filter.push({ phone });

  const lead = await BookingModel.findOne({ $or: filter })
    .sort({ createdAt: -1 })
    .select("status bookingId");

  if (!lead) {
    return res.json({ found: false });
  }

  return res.json({
    found: true,
    bookingId: lead.bookingId,
    status: lead.status
  });
}

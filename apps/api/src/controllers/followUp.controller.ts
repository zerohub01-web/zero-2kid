import { Request, Response } from "express";
import { FollowUpModel } from "../models/FollowUp.js";

export async function getFollowUps(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const day = typeof req.query.day === "string" ? Number(req.query.day) : Number.NaN;

  const query: Record<string, unknown> = {};
  if (status && status !== "all") {
    if (!["pending", "sent", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid follow-up status filter." });
    }
    query.status = status;
  }

  if (!Number.isNaN(day)) {
    if (![0, 1, 3, 5].includes(day)) {
      return res.status(400).json({ message: "Invalid follow-up day filter." });
    }
    query.day = day;
  }

  const rows = await FollowUpModel.find(query)
    .populate("leadId", "bookingId name email phone service status createdAt followUpSentAt")
    .sort({ scheduledAt: 1, createdAt: 1 })
    .limit(500);

  return res.json(
    rows.map((row) => ({
      id: String(row._id),
      leadId: row.leadId && typeof row.leadId === "object" ? String((row.leadId as any)._id) : String(row.leadId),
      day: row.day,
      channel: row.channel,
      status: row.status,
      sent: row.sent,
      scheduledAt: row.scheduledAt,
      sentAt: row.sentAt,
      errorMessage: row.errorMessage ?? "",
      lead:
        row.leadId && typeof row.leadId === "object"
          ? {
              id: String((row.leadId as any)._id),
              bookingId: (row.leadId as any).bookingId,
              name: (row.leadId as any).name,
              email: (row.leadId as any).email,
              phone: (row.leadId as any).phone,
              service: (row.leadId as any).service,
              status: (row.leadId as any).status,
              createdAt: (row.leadId as any).createdAt,
              followUpSentAt: (row.leadId as any).followUpSentAt ?? null
            }
          : null
    }))
  );
}

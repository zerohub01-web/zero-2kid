import { Request, Response } from "express";
import mongoose from "mongoose";
import { BookingModel } from "../models/Booking.js";
import { ProjectTimelineModel } from "../models/ProjectTimeline.js";
import { sendMilestoneUpdateEmail } from "../services/email.service.js";
import { logActivity } from "../services/activity.service.js";

const DEFAULT_MILESTONES = [
  { key: "planned", title: "Planned", status: "PENDING", files: [], comments: [], updatedAt: new Date() },
  { key: "in_progress", title: "In Progress", status: "PENDING", files: [], comments: [], updatedAt: new Date() },
  { key: "delivered", title: "Delivered", status: "PENDING", files: [], comments: [], updatedAt: new Date() }
];

export async function ensureTimelineForBooking(bookingId: string) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) return null;

  let timeline = await ProjectTimelineModel.findOne({ bookingId: booking._id });
  if (!timeline) {
    timeline = await ProjectTimelineModel.create({
      bookingId: booking._id,
      customerEmail: booking.email,
      customerName: booking.name,
      milestones: DEFAULT_MILESTONES
    });
  }

  return timeline;
}

export async function getAdminProjectTimelines(_req: Request, res: Response) {
  const timelines = await ProjectTimelineModel.find().sort({ updatedAt: -1 });
  return res.json(timelines);
}

export async function updateMilestone(req: Request, res: Response) {
  const { bookingId, milestoneKey } = req.params;
  const { status, fileUrl, comment } = req.body as {
    status?: "PENDING" | "DONE";
    fileUrl?: string;
    comment?: string;
  };

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ message: "Invalid bookingId" });
  }

  const timeline = await ensureTimelineForBooking(bookingId);
  if (!timeline) return res.status(404).json({ message: "Timeline not found" });

  const milestone = timeline.milestones.find((m) => m.key === milestoneKey);
  if (!milestone) return res.status(404).json({ message: "Milestone not found" });

  let statusChanged = false;
  if (status && milestone.status !== status) {
    milestone.status = status;
    statusChanged = true;
  }

  if (fileUrl) milestone.files.push(fileUrl);
  if (comment) milestone.comments.push({ text: comment, by: req.admin?.adminId ?? "admin", at: new Date() });
  milestone.updatedAt = new Date();
  timeline.markModified("milestones");
  await timeline.save();

  if (statusChanged) {
    try {
      await sendMilestoneUpdateEmail({
        customerEmail: timeline.customerEmail,
        customerName: timeline.customerName,
        milestoneTitle: milestone.title,
        status: milestone.status
      });
    } catch (error) {
      console.error("Milestone status email failed:", error);
    }
  }

  try {
    await logActivity("PROJECT_MILESTONE_UPDATED", req.admin?.adminId ?? "system", {
      bookingId,
      milestoneKey,
      status,
      hasFile: Boolean(fileUrl),
      hasComment: Boolean(comment)
    });
  } catch (error) {
    console.error("Milestone activity log failed:", error);
  }

  return res.json(timeline);
}

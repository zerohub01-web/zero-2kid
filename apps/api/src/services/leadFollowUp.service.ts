import { BookingModel, toCanonicalBookingStatus } from "../models/Booking.js";
import { FollowUpModel } from "../models/FollowUp.js";
import {
  sendLeadDayOneFollowUpEmail,
  sendLeadFinalReminderEmail
} from "./email.service.js";
import { sendLeadFollowUpWhatsApp } from "./whatsapp.service.js";
import { appendOutboundChatMessage, isValidPhoneE164, normalizePhoneE164 } from "./chat.service.js";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
let followUpTimer: NodeJS.Timeout | null = null;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function scheduleLeadFollowUps(params: {
  leadId: string;
  leadCreatedAt: Date;
  leadPhone: string;
  dayZeroEmailSent: boolean;
  dayZeroWhatsAppSent: boolean;
}) {
  const base = params.leadCreatedAt;
  const normalizedPhone = normalizePhoneE164(params.leadPhone);
  const hasValidWhatsApp = isValidPhoneE164(normalizedPhone);

  const records = [
    {
      day: 0 as const,
      channel: "email" as const,
      status: params.dayZeroEmailSent ? "sent" : "failed",
      sent: params.dayZeroEmailSent,
      scheduledAt: base,
      sentAt: params.dayZeroEmailSent ? new Date() : null,
      errorMessage: params.dayZeroEmailSent ? "" : "Day 0 email delivery failed."
    },
    {
      day: 0 as const,
      channel: "whatsapp" as const,
      status: !hasValidWhatsApp ? "cancelled" : params.dayZeroWhatsAppSent ? "sent" : "failed",
      sent: hasValidWhatsApp && params.dayZeroWhatsAppSent,
      scheduledAt: base,
      sentAt: hasValidWhatsApp && params.dayZeroWhatsAppSent ? new Date() : null,
      errorMessage: !hasValidWhatsApp
        ? "Phone number unavailable for WhatsApp."
        : params.dayZeroWhatsAppSent
          ? ""
          : "Day 0 WhatsApp delivery failed."
    },
    {
      day: 1 as const,
      channel: "email" as const,
      status: "pending" as const,
      sent: false,
      scheduledAt: addDays(base, 1),
      sentAt: null,
      errorMessage: ""
    },
    {
      day: 3 as const,
      channel: "whatsapp" as const,
      status: hasValidWhatsApp ? ("pending" as const) : ("cancelled" as const),
      sent: false,
      scheduledAt: addDays(base, 3),
      sentAt: null,
      errorMessage: hasValidWhatsApp ? "" : "Phone number unavailable for WhatsApp."
    },
    {
      day: 5 as const,
      channel: "email" as const,
      status: "pending" as const,
      sent: false,
      scheduledAt: addDays(base, 5),
      sentAt: null,
      errorMessage: ""
    }
  ];

  await Promise.all(
    records.map((record) =>
      FollowUpModel.updateOne(
        { leadId: params.leadId, day: record.day, channel: record.channel },
        {
          $set: {
            status: record.status,
            sent: record.sent,
            scheduledAt: record.scheduledAt,
            sentAt: record.sentAt,
            errorMessage: record.errorMessage
          },
          $setOnInsert: {
            leadId: params.leadId,
            day: record.day,
            channel: record.channel
          }
        },
        { upsert: true }
      )
    )
  );
}

async function processTask(task: any) {
  const lead = await BookingModel.findById(task.leadId).select("name email phone bookingId status");
  if (!lead) {
    task.status = "cancelled";
    task.errorMessage = "Lead not found.";
    await task.save();
    return;
  }

  const canonicalStatus = toCanonicalBookingStatus(lead.status) ?? "new";
  if (canonicalStatus === "converted") {
    task.status = "cancelled";
    task.errorMessage = "Lead converted. Follow-up cancelled.";
    await task.save();
    return;
  }

  try {
    if (task.channel === "email" && task.day === 1) {
      await sendLeadDayOneFollowUpEmail({
        customerEmail: lead.email,
        customerName: lead.name,
        bookingId: lead.bookingId
      });
    } else if (task.channel === "email" && task.day === 5) {
      await sendLeadFinalReminderEmail({
        customerEmail: lead.email,
        customerName: lead.name,
        bookingId: lead.bookingId
      });
    } else if (task.channel === "whatsapp" && task.day === 3) {
      await sendLeadFollowUpWhatsApp({ phone: lead.phone });
      await appendOutboundChatMessage({
        phone: lead.phone,
        message: "Just checking if you're still interested.",
        source: "system"
      });
    } else {
      task.status = "cancelled";
      task.errorMessage = "Unsupported follow-up task configuration.";
      await task.save();
      return;
    }

    task.status = "sent";
    task.sent = true;
    task.sentAt = new Date();
    task.errorMessage = "";
    await task.save();
  } catch (error) {
    task.status = "failed";
    task.errorMessage = error instanceof Error ? error.message.slice(0, 400) : "Unknown follow-up failure.";
    await task.save();
  }
}

export async function processPendingLeadFollowUps() {
  const tasks = await FollowUpModel.find({
    status: "pending",
    sent: false,
    scheduledAt: { $lte: new Date() }
  })
    .sort({ scheduledAt: 1 })
    .limit(150);

  if (tasks.length === 0) return;

  const results = await Promise.allSettled(tasks.map((task) => processTask(task)));
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Lead follow-up task processing crashed:", result.reason);
    }
  });
}

export function startLeadFollowUpWorker(intervalMs = DEFAULT_INTERVAL_MS) {
  if (followUpTimer) return;

  void processPendingLeadFollowUps().catch((error) => {
    console.error("Lead follow-up initial run failed:", error);
  });

  followUpTimer = setInterval(() => {
    void processPendingLeadFollowUps().catch((error) => {
      console.error("Lead follow-up worker error:", error);
    });
  }, intervalMs);

  followUpTimer.unref?.();
}

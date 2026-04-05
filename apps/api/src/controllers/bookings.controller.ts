import crypto from "crypto";
import { Request, Response } from "express";
import {
  BookingModel,
  CanonicalBookingStatus,
  LeadScore,
  statusQueryValues,
  toCanonicalBookingStatus
} from "../models/Booking.js";
import { ProjectTimelineModel } from "../models/ProjectTimeline.js";
import { ServiceModel } from "../models/Service.js";
import { env } from "../config/env.js";
import {
  sendBookingCreatedEmails,
  sendBookingFeeQuoteEmail,
  sendBookingStatusEmail,
  sendClientCredentialsEmail,
  sendProposalEmail
} from "../services/email.service.js";
import { verifyRecaptchaToken } from "../services/recaptcha.service.js";
import { logActivity } from "../services/activity.service.js";
import {
  sanitizeEmail,
  sanitizeMultiline,
  sanitizePhone,
  sanitizeSingleLine
} from "../utils/sanitize.js";
import { analyzeLead, resolveProposalPlan } from "../services/leadAutomation.service.js";
import { generateProposalForLead } from "../services/proposal.service.js";
import { CustomerModel } from "../models/Customer.js";
import { ProjectModel } from "../models/Project.js";
import { appendOutboundChatMessage, normalizePhoneE164 } from "../services/chat.service.js";
import { ChatModel } from "../models/Chat.js";
import { scheduleLeadFollowUps } from "../services/leadFollowUp.service.js";
import { FollowUpModel } from "../models/FollowUp.js";
import { sendLeadCreatedWhatsApp } from "../services/whatsapp.service.js";

function getRequestIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return req.ip || req.socket.remoteAddress || "";
}

function getRequestOrigin(req: Request) {
  const host = req.get("host") ?? "localhost:4000";
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${proto}://${host}`;
}

function getWebBaseUrl(req?: Request) {
  const configuredBase = env.webBaseUrl?.replace(/\/$/, "");
  if (configuredBase) return configuredBase;

  if (req) {
    return (env.clientOrigin || getRequestOrigin(req)).replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function generateBookingId() {
  const dateStamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BK-${dateStamp}-${random}`;
}

function normalizeBookingStatus(status: string): CanonicalBookingStatus {
  return toCanonicalBookingStatus(status) ?? "new";
}

function parseBudget(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : null;
  }

  const normalized = String(rawValue).replace(/[^\d.]/g, "").trim();
  if (!normalized) return null;

  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function serializeBooking(booking: any) {
  const source = typeof booking.toObject === "function" ? booking.toObject() : booking;

  return {
    id: String(source._id),
    _id: String(source._id),
    bookingId: source.bookingId,
    name: source.name,
    email: source.email,
    phone: source.phone,
    businessType: source.businessType,
    service: source.service,
    budget: source.budget ?? null,
    quotedFee: source.quotedFee ?? null,
    quotedAt: source.quotedAt ?? null,
    message: source.message ?? source.currentWorkflow ?? "",
    date: source.date,
    status: normalizeBookingStatus(source.status),
    score: (source.score ?? "medium") as LeadScore,
    proposalUrl: source.proposalUrl ?? "",
    proposalGeneratedAt: source.proposalGeneratedAt ?? null,
    followUpSentAt: source.followUpSentAt ?? null,
    createdAt: source.createdAt,
    ipAddress: source.ipAddress ?? "",
    servicePriceSnapshot: source.servicePriceSnapshot ?? 0
  };
}

export async function createBooking(req: Request, res: Response) {
  const honeypot = String(req.body.website ?? "").trim();
  if (honeypot) {
    return res.status(400).json({ message: "Spam submission rejected." });
  }

  const ipAddress = getRequestIp(req);
  const recaptchaToken = String(req.body.recaptchaToken ?? "").trim();
  const recaptchaAction = String(req.body.recaptchaAction ?? "").trim();
  const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, ipAddress, {
    expectedAction: recaptchaAction || undefined
  });
  if (!recaptchaResult.ok) {
    console.warn("[Booking] CAPTCHA rejected:", {
      code: recaptchaResult.code,
      reason: recaptchaResult.reason,
      details: recaptchaResult.details ?? [],
      action: recaptchaAction || null
    });
    const status = recaptchaResult.code === "captcha_unavailable" ? 503 : 400;
    return res.status(status).json({
      error: recaptchaResult.reason,
      code: recaptchaResult.code
    });
  }

  const cleanName = sanitizeSingleLine(req.body.name, 80);
  const cleanEmail = sanitizeEmail(req.body.email);
  const cleanPhone = sanitizePhone(req.body.phone);
  const cleanBusinessType = sanitizeSingleLine(req.body.businessType, 120);
  const cleanService = sanitizeSingleLine(req.body.service, 120);
  const cleanMessage = sanitizeMultiline(req.body.message, 1200);
  const budget = parseBudget(req.body.budget);

  const requestedDate = req.body.date ? new Date(String(req.body.date)) : new Date();
  if (Number.isNaN(requestedDate.getTime())) {
    return res.status(400).json({ message: "Invalid date provided." });
  }

  const duplicateWindowStart = new Date(Date.now() - 10 * 60 * 1000);
  const existing = await BookingModel.findOne({
    email: cleanEmail,
    phone: cleanPhone,
    service: cleanService,
    createdAt: { $gte: duplicateWindowStart }
  }).select("bookingId createdAt");

  if (existing) {
    return res.status(409).json({
      message: "Duplicate submission detected. Please wait before sending another request.",
      bookingId: existing.bookingId
    });
  }

  const serviceDoc = await ServiceModel.findOne({ title: cleanService, isActive: true }).select("price");
  const proposalPlan = resolveProposalPlan(cleanService);
  const leadQualification = await analyzeLead({
    budget: budget ?? undefined,
    businessType: cleanBusinessType,
    message: cleanMessage
  });
  const score = leadQualification.score;
  const servicePriceSnapshot = serviceDoc?.price ?? proposalPlan.price;

  const booking = await BookingModel.create({
    bookingId: generateBookingId(),
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    businessType: cleanBusinessType,
    service: cleanService,
    budget,
    message: cleanMessage,
    currentWorkflow: cleanMessage,
    score,
    servicePriceSnapshot,
    date: requestedDate,
    status: "new",
    ipAddress
  });

  const baseUrl = getWebBaseUrl(req);
  const trackingUrl = `${baseUrl}/booking-status/${booking.bookingId}`;
  const adminUrl = `${baseUrl}/zero-control`;

  // Async pipeline should not block primary lead submission response.
  Promise.resolve()
    .then(async () => {
      const notificationResults = await Promise.allSettled([
        sendBookingCreatedEmails({
          customerEmail: booking.email,
          customerName: booking.name,
          service: booking.service,
          bookingId: booking.bookingId,
          message: booking.message,
          businessType: booking.businessType,
          phone: booking.phone,
          budget: booking.budget ?? null,
          score: booking.score,
          trackingUrl,
          adminUrl,
          ipAddress
        }),
        (async () => {
          await sendLeadCreatedWhatsApp({
            name: booking.name,
            phone: booking.phone
          });

          await appendOutboundChatMessage({
            phone: booking.phone,
            message: `Hi ${booking.name}, we received your request. We will contact you shortly.`,
            source: "system"
          });

          console.info("New booking captured. Day-0 WhatsApp sent automatically.", {
            bookingId: booking.bookingId,
            name: booking.name,
            email: booking.email,
            phone: booking.phone,
            service: booking.service
          });
        })()
      ]);

      const [emailResult, whatsappResult] = notificationResults;
      if (emailResult.status === "rejected") {
        console.error("Lead confirmation/admin email step failed:", emailResult.reason);
      }
      if (whatsappResult.status === "rejected") {
        console.error("Lead client-side WhatsApp marker step failed:", whatsappResult.reason);
      }

      await scheduleLeadFollowUps({
        leadId: String(booking._id),
        leadCreatedAt: booking.createdAt ?? new Date(),
        leadPhone: booking.phone,
        dayZeroEmailSent: emailResult.status === "fulfilled",
        dayZeroWhatsAppSent: false
      });

      let proposalUrl = "";
      try {
        await generateProposalForLead(booking, `${getRequestOrigin(req).replace(/\/$/, "")}/api/proposals`);
        proposalUrl = `${getWebBaseUrl(req)}/api/proposals/${String(booking._id)}/pdf`;

        booking.proposalUrl = proposalUrl;
        booking.proposalGeneratedAt = new Date();
        await booking.save();

        await sendProposalEmail({
          customerEmail: booking.email,
          customerName: booking.name,
          service: booking.service,
          bookingId: booking.bookingId,
          proposalUrl
        });
      } catch (proposalError) {
        console.error("Lead proposal generation/email step failed:", proposalError);
      }

      await logActivity("LEAD_AUTOMATION_COMPLETED", "system", {
        bookingId: String(booking._id),
        publicBookingId: booking.bookingId,
        qualificationSource: leadQualification.source,
        score: booking.score,
        proposalUrl
      });
    })
    .catch((error) => {
      console.error("Lead automation pipeline failed:", error);
    });

  void logActivity("BOOKING_CREATED", booking.email, {
    bookingId: String(booking._id),
    publicBookingId: booking.bookingId,
    clientName: booking.name,
    ipAddress,
    qualificationSource: leadQualification.source,
    score
  }).catch((error) => console.error("Activity log failed:", error));

  return res.status(201).json({
    message: "Your request has been received. We will contact you soon.",
    bookingId: booking.bookingId,
    booking: serializeBooking(booking)
  });
}

export async function getBookings(req: Request, res: Response) {
  const rawStatus = typeof req.query.status === "string" ? req.query.status : "";
  const rawScore = typeof req.query.score === "string" ? req.query.score : "";
  const query: Record<string, unknown> = {};

  if (rawStatus && rawStatus !== "all") {
    const canonicalStatus = toCanonicalBookingStatus(rawStatus);
    if (!canonicalStatus) {
      return res.status(400).json({ message: "Invalid status filter." });
    }
    query.status = { $in: statusQueryValues(canonicalStatus) };
  }

  if (rawScore && rawScore !== "all") {
    if (!["high", "medium", "low"].includes(rawScore)) {
      return res.status(400).json({ message: "Invalid score filter." });
    }
    query.score = rawScore;
  }

  const bookings = await BookingModel.find(query).sort({ createdAt: -1 }).limit(500);
  return res.json(bookings.map((booking) => serializeBooking(booking)));
}

export async function updateBookingStatus(req: Request, res: Response) {
  const { id } = req.params;
  const hasStatusUpdate = typeof req.body.status !== "undefined";
  const hasQuoteUpdate = typeof req.body.quotedFee !== "undefined";
  const shouldSendQuote = Boolean(req.body.sendQuote);

  if (!hasStatusUpdate && !hasQuoteUpdate) {
    return res.status(400).json({ message: "Nothing to update." });
  }

  const booking = await BookingModel.findById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const previousStatus = normalizeBookingStatus(booking.status);
  let nextStatus: CanonicalBookingStatus = previousStatus;

  if (hasStatusUpdate) {
    const nextStatusRaw = String(req.body.status ?? "");
    const parsedStatus = toCanonicalBookingStatus(nextStatusRaw);
    if (!parsedStatus) {
      return res.status(400).json({ message: "Invalid status value." });
    }
    nextStatus = parsedStatus;
    booking.status = nextStatus;
  }

  if (hasQuoteUpdate) {
    const quoteValue = Number(req.body.quotedFee);
    if (!Number.isFinite(quoteValue) || quoteValue < 0) {
      return res.status(400).json({ message: "Quoted fee must be a valid non-negative number." });
    }
    booking.quotedFee = quoteValue;
    if (shouldSendQuote) {
      booking.quotedAt = new Date();
    }
  }

  await booking.save();

  if (nextStatus !== "new") {
    try {
      const { ensureTimelineForBooking } = await import("./projectTimeline.controller.js");
      await ensureTimelineForBooking(id);
    } catch (error) {
      console.error("Timeline bootstrap failed while updating booking status:", error);
    }
  }

  if (previousStatus !== "converted" && nextStatus === "converted") {
    try {
      let generatedPassword = "";
      let customer = await CustomerModel.findOne({ email: booking.email.toLowerCase() });

      if (!customer) {
        generatedPassword = crypto.randomBytes(6).toString("base64url");
        customer = await CustomerModel.create({
          name: booking.name,
          email: booking.email,
          password: generatedPassword,
          authProvider: "local",
          isVerified: true
        });
        await sendClientCredentialsEmail({
          customerEmail: customer.email,
          customerName: customer.name,
          plainPassword: generatedPassword
        });
      }

      if (customer) {
        await ProjectModel.findOneAndUpdate(
          { leadId: booking._id },
          {
            clientId: customer._id,
            leadId: booking._id,
            status: "converted",
            timeline: `Proposed timeline: ${resolveProposalPlan(booking.service).timeline}`,
            files: []
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      await ChatModel.findOneAndUpdate(
        { phone: normalizePhoneE164(booking.phone) },
        { status: "converted" },
        { new: true }
      );

      await FollowUpModel.updateMany(
        { leadId: booking._id, status: "pending" },
        {
          status: "cancelled",
          errorMessage: "Lead converted. Follow-up cancelled."
        }
      );
    } catch (error) {
      console.error("Post-conversion workflow failed:", error);
    }
  }

  if (previousStatus !== nextStatus && (nextStatus === "contacted" || nextStatus === "converted")) {
    try {
      await sendBookingStatusEmail({
        customerEmail: booking.email,
        customerName: booking.name,
        status: nextStatus,
        service: booking.service,
        bookingId: booking.bookingId
      });
    } catch (error) {
      console.error("Booking status email failed:", error);
    }
  }

  if (hasQuoteUpdate && shouldSendQuote && typeof booking.quotedFee === "number") {
    try {
      await sendBookingFeeQuoteEmail({
        customerEmail: booking.email,
        customerName: booking.name,
        bookingId: booking.bookingId,
        service: booking.service,
        quotedFee: booking.quotedFee
      });
    } catch (error) {
      console.error("Booking fee quote email failed:", error);
    }
  }

  try {
    await logActivity("BOOKING_STATUS_CHANGED", req.admin?.adminId ?? "system", {
      bookingId: String(booking._id),
      publicBookingId: booking.bookingId,
      status: nextStatus,
      quotedFee: booking.quotedFee ?? null,
      quoteSent: Boolean(hasQuoteUpdate && shouldSendQuote)
    });
  } catch (error) {
    console.error("Booking status activity log failed:", error);
  }

  return res.json(serializeBooking(booking));
}

export async function deleteBooking(req: Request, res: Response) {
  const { id } = req.params;

  const booking = await BookingModel.findByIdAndDelete(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  await ProjectTimelineModel.deleteOne({ bookingId: booking._id });

  await logActivity("BOOKING_DELETED", req.admin?.adminId ?? "system", {
    bookingId: String(booking._id),
    publicBookingId: booking.bookingId,
    email: booking.email
  });

  return res.json({ message: "Booking deleted successfully." });
}

export async function getBookingDetails(req: Request, res: Response) {
  const requestedBookingId = String(req.params.id ?? "").trim();
  if (!requestedBookingId) {
    return res.status(400).json({ message: "Booking ID is required." });
  }

  const booking =
    /^[0-9a-fA-F]{24}$/.test(requestedBookingId)
      ? await BookingModel.findById(requestedBookingId)
      : await BookingModel.findOne({ bookingId: requestedBookingId.toUpperCase() });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  const amount = Number(booking.quotedFee ?? booking.servicePriceSnapshot ?? booking.budget ?? 0);

  return res.json({
    booking: {
      ...serializeBooking(booking),
      fullName: booking.name,
      emailAddress: booking.email,
      phoneNumber: booking.phone,
      company: booking.businessType,
      business: booking.businessType,
      businessType: booking.businessType,
      serviceType: booking.service,
      amount,
      totalAmount: amount,
      address: "",
      city: "",
      country: "IN"
    }
  });
}

export async function getBookingStatus(req: Request, res: Response) {
  const requestedBookingId = String(req.params.bookingId ?? "").trim().toUpperCase();
  if (!requestedBookingId) {
    return res.status(400).json({ message: "Booking ID is required." });
  }

  const booking = await BookingModel.findOne({ bookingId: requestedBookingId }).select(
    "bookingId service status createdAt date proposalUrl"
  );

  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  return res.json({
    bookingId: booking.bookingId,
    status: normalizeBookingStatus(booking.status),
    service: booking.service,
    proposalUrl: booking.proposalUrl ?? "",
    createdAt: booking.createdAt,
    date: booking.date
  });
}


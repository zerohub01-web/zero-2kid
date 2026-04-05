import { Request, Response } from "express";
import { ReviewModel, type ReviewDocument, type ReviewStatus } from "../db/schema.js";
import { CustomerModel } from "../models/Customer.js";
import { BookingModel } from "../models/Booking.js";
import { logActivity } from "../services/activity.service.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";
import { verifyToken } from "../utils/auth.js";

function isReviewStatus(value: string): value is ReviewStatus {
  return ["PENDING", "APPROVED", "REJECTED"].includes(value);
}

function approvedReviewFilter(): Record<string, unknown> {
  return {
    $or: [{ status: "APPROVED" }, { status: "approved" }, { approved: true }]
  };
}

function getAdminContext(req: Request) {
  const token = req.cookies?.token;
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (payload.token_type !== "admin" || !payload.adminId) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function toReviewView(review: ReviewDocument) {
  const reviewText = review.reviewText || review.testimonial || "";
  return {
    id: String(review._id),
    _id: String(review._id),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    publishedAt: review.publishedAt ?? null,
    status: review.status,
    approved: Boolean(review.approved),
    clientName: review.clientName,
    clientEmail: review.clientEmail,
    clientBusiness: review.clientBusiness ?? "",
    serviceUsed: review.serviceUsed ?? "",
    rating: review.rating,
    reviewText,
    testimonial: review.testimonial || reviewText,
    approvedBy: review.approvedBy ?? "",
    rejectedBy: review.rejectedBy ?? "",
    rejectReason: review.rejectReason ?? "",
    source: review.source,
    featured: Boolean(review.featured),
    displayOrder: Number(review.displayOrder ?? 0)
  };
}

async function sendReviewPublishedWhatsApp(review: ReviewDocument) {
  const booking = await BookingModel.findOne({ email: review.clientEmail }).sort({ createdAt: -1 }).select("phone name");
  if (!booking?.phone) return;

  await sendWhatsAppMessage({
    phone: booking.phone,
    message:
      `Hi ${review.clientName || booking.name || "there"}! \u{1F31F} Your review for ZERO OPS has been published. ` +
      `Thank you for your kind words!\n\n\u2014 ZERO OPS Team`
  });
}

export const submitReview = async (req: Request, res: Response) => {
  try {
    const rating = Number(req.body?.rating ?? 0);
    const reviewText = String(req.body?.reviewText ?? req.body?.testimonial ?? "").trim();

    if (!rating || !reviewText) {
      return res.status(400).json({ message: "Rating and review text are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (reviewText.length > 500) {
      return res.status(400).json({ message: "Review must be under 500 characters" });
    }

    const customer = req.customer?.customerId
      ? await CustomerModel.findById(req.customer.customerId).select("name email")
      : null;

    const clientName = String(req.body?.clientName ?? customer?.name ?? "Client").trim();
    const clientEmail = String(req.body?.clientEmail ?? req.customer?.email ?? customer?.email ?? "").trim().toLowerCase();
    const clientBusiness = String(req.body?.clientBusiness ?? "").trim();
    const serviceUsed = String(req.body?.serviceUsed ?? "").trim();
    const source = String(req.body?.source ?? "portal").trim() || "portal";

    if (!clientName || !clientEmail) {
      return res.status(400).json({ message: "Client identity is required to submit a review" });
    }

    const matchQuery = req.customer?.customerId
      ? { $or: [{ clientId: req.customer.customerId }, { clientEmail }] }
      : { clientEmail };

    let review = await ReviewModel.findOne(matchQuery).sort({ createdAt: -1 });
    if (!review) {
      review = new ReviewModel();
    }

    if (req.customer?.customerId) {
      review.clientId = req.customer.customerId as any;
    }

    review.clientName = clientName;
    review.clientEmail = clientEmail;
    review.clientBusiness = clientBusiness;
    review.serviceUsed = serviceUsed;
    review.rating = rating;
    review.reviewText = reviewText;
    review.testimonial = reviewText;
    review.status = "PENDING";
    review.approved = false;
    review.publishedAt = undefined;
    review.approvedBy = "";
    review.rejectedBy = "";
    review.rejectReason = "";
    review.source = source;

    await review.save();

    await logActivity("REVIEW_SUBMITTED", req.customer?.email ?? clientEmail, {
      reviewId: String(review._id),
      clientEmail,
      rating
    });

    return res.status(200).json({ message: "Review submitted successfully", review: toReviewView(review) });
  } catch (error: any) {
    console.error("Submit review failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getOwnReview = async (req: Request, res: Response) => {
  try {
    const query = req.customer?.customerId
      ? { $or: [{ clientId: req.customer.customerId }, { clientEmail: req.customer.email }] }
      : { clientEmail: req.customer?.email };
    const review = await ReviewModel.findOne(query).sort({ createdAt: -1 });
    return res.status(200).json({ review: review ? toReviewView(review) : null });
  } catch (error: any) {
    console.error("Get own review failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getReviews = async (req: Request, res: Response) => {
  try {
    const requestedStatus = String(req.query.status ?? "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 12) || 12));
    const admin = getAdminContext(req);

    let where: Record<string, unknown> = {};
    if (admin) {
      if (requestedStatus && isReviewStatus(requestedStatus)) {
        where.status = requestedStatus;
      }
    } else {
      where = approvedReviewFilter();
    }

    const reviews = await ReviewModel.find(where)
      .sort({ featured: -1, displayOrder: 1, publishedAt: -1, createdAt: -1 })
      .limit(limit);

    return res.status(200).json({ reviews: reviews.map((review) => toReviewView(review)) });
  } catch (error: any) {
    console.error("Get reviews failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getApprovedReviews = async (req: Request, res: Response) => {
  req.query.status = "APPROVED";
  return getReviews(req, res);
};

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const requestedStatus = String(req.query.status ?? "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 200) || 200));
    const where: Record<string, unknown> = {};
    if (requestedStatus && isReviewStatus(requestedStatus)) {
      where.status = requestedStatus;
    }

    const reviews = await ReviewModel.find(where).sort({ createdAt: -1 }).limit(limit);
    return res.status(200).json({ reviews: reviews.map((review) => toReviewView(review)) });
  } catch (error: any) {
    console.error("Get all reviews failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

async function moderateReview(req: Request, res: Response, nextStatus: ReviewStatus) {
  try {
    const { id } = req.params;
    const review = await ReviewModel.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.status = nextStatus;
    review.approved = nextStatus === "APPROVED";

    if (nextStatus === "APPROVED") {
      review.publishedAt = new Date();
      review.approvedBy = req.admin?.adminId ?? "";
      review.rejectedBy = "";
      review.rejectReason = "";
    } else if (nextStatus === "REJECTED") {
      review.publishedAt = undefined;
      review.approvedBy = "";
      review.rejectedBy = req.admin?.adminId ?? "";
      review.rejectReason = String(req.body?.rejectReason ?? "").trim();
    } else {
      review.publishedAt = undefined;
      review.approvedBy = "";
      review.rejectedBy = "";
      review.rejectReason = "";
    }

    await review.save();

    await logActivity(nextStatus === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED", req.admin?.adminId ?? "admin", {
      reviewId: String(review._id),
      clientEmail: review.clientEmail,
      rating: review.rating
    });

    if (nextStatus === "APPROVED") {
      try {
        await sendReviewPublishedWhatsApp(review);
      } catch (error) {
        console.error("Review approval WhatsApp failed:", error);
      }
    }

    return res.status(200).json({ message: "Review updated successfully", review: toReviewView(review) });
  } catch (error: any) {
    console.error("Moderate review failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

export const updateReviewStatus = async (req: Request, res: Response) => {
  const nextStatus = String(req.body?.status ?? "").trim().toUpperCase();
  if (!isReviewStatus(nextStatus)) {
    return res.status(400).json({ message: "Invalid review status" });
  }

  return moderateReview(req, res, nextStatus);
};

export const approveReview = async (req: Request, res: Response) => {
  return moderateReview(req, res, "APPROVED");
};

export const rejectReview = async (req: Request, res: Response) => {
  return moderateReview(req, res, "REJECTED");
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const review = await ReviewModel.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.status(200).json({ message: "Review deleted successfully" });
  } catch (error: any) {
    console.error("Delete review failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

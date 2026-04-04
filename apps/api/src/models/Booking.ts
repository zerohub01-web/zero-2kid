import mongoose, { Schema } from "mongoose";

export type CanonicalBookingStatus = "new" | "contacted" | "converted";
export type LeadScore = "high" | "medium" | "low";
export type BookingStatus =
  | CanonicalBookingStatus
  | "closed"
  | "NEW"
  | "CONFIRMED"
  | "COMPLETED";

export interface BookingDocument extends mongoose.Document {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  service: string;
  budget?: number | null;
  quotedFee?: number | null;
  quotedAt?: Date | null;
  message: string;
  score: LeadScore;
  proposalUrl?: string;
  proposalGeneratedAt?: Date | null;
  followUpSentAt?: Date | null;
  currentWorkflow?: string;
  teamSize?: string;
  monthlyLeads?: string;
  budgetRange?: string;
  ipAddress: string;
  servicePriceSnapshot?: number;
  date: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<BookingDocument>(
  {
    bookingId: { type: String, required: true, unique: true, index: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, trim: true },
    budget: { type: Number, default: null, min: 0 },
    quotedFee: { type: Number, default: null, min: 0 },
    quotedAt: { type: Date, default: null },
    message: { type: String, required: true, trim: true },
    score: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    proposalUrl: { type: String, default: "" },
    proposalGeneratedAt: { type: Date, default: null },
    followUpSentAt: { type: Date, default: null },
    currentWorkflow: { type: String, default: "" },
    teamSize: { type: String, trim: true, default: "" },
    monthlyLeads: { type: String, trim: true, default: "" },
    budgetRange: { type: String, trim: true, default: "" },
    service: { type: String, required: true, trim: true },
    ipAddress: { type: String, default: "" },
    servicePriceSnapshot: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed", "NEW", "CONFIRMED", "COMPLETED"],
      default: "new"
    }
  },
  { timestamps: true }
);

const legacyToCanonicalMap: Record<string, CanonicalBookingStatus> = {
  NEW: "new",
  CONFIRMED: "contacted",
  COMPLETED: "converted",
  new: "new",
  contacted: "contacted",
  converted: "converted",
  closed: "converted"
};

const canonicalToQueryValuesMap: Record<CanonicalBookingStatus, BookingStatus[]> = {
  new: ["new", "NEW"],
  contacted: ["contacted", "CONFIRMED"],
  converted: ["converted", "closed", "COMPLETED"]
};

bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ email: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ followUpSentAt: 1, status: 1, createdAt: 1 });
bookingSchema.index({ score: 1, createdAt: -1 });
bookingSchema.index({ email: 1, phone: 1, service: 1, createdAt: -1 });

export const BookingModel = mongoose.model<BookingDocument>("Booking", bookingSchema);

export function toCanonicalBookingStatus(status: string): CanonicalBookingStatus | null {
  return legacyToCanonicalMap[status] ?? null;
}

export function statusQueryValues(status: CanonicalBookingStatus) {
  return canonicalToQueryValuesMap[status];
}

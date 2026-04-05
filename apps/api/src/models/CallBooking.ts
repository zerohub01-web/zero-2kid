import mongoose, { Schema } from "mongoose";

export type CallStatus = "booked" | "confirmed" | "completed" | "cancelled";

export interface CallBookingDocument extends mongoose.Document {
  name: string;
  email: string;
  phone: string;
  timeSlot: Date;
  status: CallStatus;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const callBookingSchema = new Schema<CallBookingDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    timeSlot: { type: Date, required: true },
    status: {
      type: String,
      enum: ["booked", "confirmed", "completed", "cancelled"],
      default: "booked"
    },
    reminderSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

callBookingSchema.index(
  { timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: "cancelled" } }
  }
);

callBookingSchema.index({ status: 1, timeSlot: 1 });

export const CallBookingModel = mongoose.model<CallBookingDocument>("CallBooking", callBookingSchema);

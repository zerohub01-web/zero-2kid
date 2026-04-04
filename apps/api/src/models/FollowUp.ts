import mongoose, { Schema } from "mongoose";

export type FollowUpChannel = "email" | "whatsapp";
export type FollowUpStatus = "pending" | "sent" | "failed" | "cancelled";

export interface FollowUpDocument extends mongoose.Document {
  leadId: mongoose.Types.ObjectId;
  day: 0 | 1 | 3 | 5;
  channel: FollowUpChannel;
  sent: boolean;
  status: FollowUpStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  errorMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const followUpSchema = new Schema<FollowUpDocument>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    day: { type: Number, enum: [0, 1, 3, 5], required: true },
    channel: { type: String, enum: ["email", "whatsapp"], required: true },
    sent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "cancelled"],
      default: "pending"
    },
    scheduledAt: { type: Date, required: true, index: true },
    sentAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" }
  },
  { timestamps: true }
);

followUpSchema.index({ leadId: 1, day: 1, channel: 1 }, { unique: true });
followUpSchema.index({ status: 1, scheduledAt: 1 });

export const FollowUpModel = mongoose.model<FollowUpDocument>("FollowUp", followUpSchema);

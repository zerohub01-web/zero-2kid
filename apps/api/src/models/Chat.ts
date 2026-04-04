import mongoose, { Schema } from "mongoose";

export type ChatStatus = "new" | "engaged" | "converted";
export type ChatDirection = "inbound" | "outbound";
export type ChatMessageSource = "user" | "ai" | "system" | "admin";

export interface ChatMessage {
  direction: ChatDirection;
  source: ChatMessageSource;
  text: string;
  timestamp: Date;
}

export interface ChatDocument extends mongoose.Document {
  phone: string;
  status: ChatStatus;
  messages: ChatMessage[];
  lastMessage: string;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
  followUpSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<ChatMessage>(
  {
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    source: { type: String, enum: ["user", "ai", "system", "admin"], required: true },
    text: { type: String, required: true, trim: true },
    timestamp: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const chatSchema = new Schema<ChatDocument>(
  {
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    status: { type: String, enum: ["new", "engaged", "converted"], default: "new" },
    messages: { type: [chatMessageSchema], default: [] },
    lastMessage: { type: String, trim: true, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    lastInboundAt: { type: Date, default: null },
    followUpSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

chatSchema.index({ status: 1, updatedAt: -1 });
chatSchema.index({ lastInboundAt: 1, followUpSentAt: 1, status: 1 });

export const ChatModel = mongoose.model<ChatDocument>("Chat", chatSchema);

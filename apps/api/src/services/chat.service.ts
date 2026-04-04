import { ChatDocument, ChatMessageSource, ChatModel, ChatStatus } from "../models/Chat.js";
import { sanitizeMultiline } from "../utils/sanitize.js";

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneE164(phone: string) {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/\+/g, "")}`;
  }

  return `+${cleaned.replace(/\+/g, "")}`;
}

export function isValidPhoneE164(phone: string) {
  return PHONE_REGEX.test(phone);
}

function cleanMessageText(message: string) {
  return sanitizeMultiline(message, 1200).replace(/\n{3,}/g, "\n\n");
}

async function getOrCreateChat(phone: string): Promise<ChatDocument> {
  const existing = await ChatModel.findOne({ phone });
  if (existing) return existing;
  return ChatModel.create({ phone, status: "new" });
}

export async function appendInboundChatMessage(params: {
  phone: string;
  message: string;
  timestamp?: Date;
}) {
  const phone = normalizePhoneE164(params.phone);
  if (!isValidPhoneE164(phone)) {
    throw new Error("Invalid phone number format.");
  }

  const text = cleanMessageText(params.message);
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  const timestamp = params.timestamp ?? new Date();
  const chat = await getOrCreateChat(phone);

  chat.messages.push({
    direction: "inbound",
    source: "user",
    text,
    timestamp
  });

  chat.lastMessage = text;
  chat.lastMessageAt = timestamp;
  chat.lastInboundAt = timestamp;

  if (chat.status === "new") {
    chat.status = "engaged";
  }

  await chat.save();
  return chat;
}

export async function appendOutboundChatMessage(params: {
  phone: string;
  message: string;
  source?: ChatMessageSource;
  timestamp?: Date;
}) {
  const phone = normalizePhoneE164(params.phone);
  if (!isValidPhoneE164(phone)) {
    throw new Error("Invalid phone number format.");
  }

  const text = cleanMessageText(params.message);
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  const timestamp = params.timestamp ?? new Date();
  const source = params.source ?? "system";
  const chat = await getOrCreateChat(phone);

  chat.messages.push({
    direction: "outbound",
    source,
    text,
    timestamp
  });

  chat.lastMessage = text;
  chat.lastMessageAt = timestamp;
  await chat.save();
  return chat;
}

export async function updateChatStatusById(chatId: string, status: ChatStatus) {
  return ChatModel.findByIdAndUpdate(chatId, { status }, { new: true });
}

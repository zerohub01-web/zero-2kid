import { Request, Response } from "express";
import { ChatModel } from "../models/Chat.js";
import { updateChatStatusById } from "../services/chat.service.js";

export async function getChats(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";

  const query: Record<string, unknown> = {};

  if (status && status !== "all") {
    if (!["new", "engaged", "converted"].includes(status)) {
      return res.status(400).json({ message: "Invalid chat status filter." });
    }
    query.status = status;
  }

  if (phone) {
    const escaped = phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.phone = { $regex: escaped, $options: "i" };
  }

  const chats = await ChatModel.find(query).sort({ updatedAt: -1 }).limit(200);

  return res.json(
    chats.map((chat) => ({
      id: String(chat._id),
      phone: chat.phone,
      status: chat.status,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      lastInboundAt: chat.lastInboundAt,
      followUpSentAt: chat.followUpSentAt,
      messages: chat.messages
    }))
  );
}

export async function updateChatStatus(req: Request, res: Response) {
  const chat = await updateChatStatusById(req.params.id, req.body.status);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found." });
  }

  return res.json({
    id: String(chat._id),
    phone: chat.phone,
    status: chat.status,
    lastMessage: chat.lastMessage,
    lastMessageAt: chat.lastMessageAt,
    messages: chat.messages
  });
}

import { ChatModel } from "../models/Chat.js";
import { appendOutboundChatMessage } from "./chat.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const FOLLOW_UP_TEXT = "Just checking if you're still interested.";

let followUpTimer: NodeJS.Timeout | null = null;

export async function processPendingChatFollowUps() {
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

  const chats = await ChatModel.find({
    status: { $in: ["new", "engaged"] },
    lastInboundAt: { $ne: null, $lte: cutoff }
  })
    .sort({ lastInboundAt: 1 })
    .limit(100);

  if (chats.length === 0) return;

  const pending = chats.filter((chat) => {
    if (!chat.lastInboundAt) return false;
    if (!chat.followUpSentAt) return true;
    return chat.followUpSentAt < chat.lastInboundAt;
  });

  if (pending.length === 0) return;

  const tasks = pending.map(async (chat) => {
    try {
      await sendWhatsAppMessage({
        phone: chat.phone,
        message: FOLLOW_UP_TEXT
      });

      await appendOutboundChatMessage({
        phone: chat.phone,
        message: FOLLOW_UP_TEXT,
        source: "system"
      });

      await ChatModel.updateOne({ _id: chat._id }, { followUpSentAt: new Date() });
    } catch (error) {
      console.error(`Chat follow-up failed for ${chat.phone}:`, error);
    }
  });

  await Promise.allSettled(tasks);
}

export function startChatFollowUpWorker(intervalMs = DEFAULT_INTERVAL_MS) {
  if (followUpTimer) return;

  void processPendingChatFollowUps().catch((error) => {
    console.error("Chat follow-up initial run failed:", error);
  });

  followUpTimer = setInterval(() => {
    void processPendingChatFollowUps().catch((error) => {
      console.error("Chat follow-up worker error:", error);
    });
  }, intervalMs);

  followUpTimer.unref?.();
}

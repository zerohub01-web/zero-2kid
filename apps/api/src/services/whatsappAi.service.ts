import { env } from "../config/env.js";
import { sanitizeMultiline } from "../utils/sanitize.js";

const SYSTEM_PROMPT =
  "You are an assistant for ZERO, a business automation company. Reply professionally and helpfully.";

const FALLBACK_REPLY =
  "Thanks for your message. Our ZERO team received it and will get back to you shortly with the next steps.";

interface HistoryMessage {
  direction: "inbound" | "outbound";
  text: string;
}

function buildConversationContext(history: HistoryMessage[] = []) {
  if (history.length === 0) return "No previous messages.";

  return history
    .slice(-6)
    .map((entry) => `${entry.direction === "inbound" ? "Client" : "ZERO"}: ${entry.text}`)
    .join("\n");
}

export async function generateReply(message: string, history: HistoryMessage[] = []) {
  const cleanMessage = sanitizeMultiline(message, 1000);
  if (!cleanMessage) return FALLBACK_REPLY;

  if (!env.openaiApiKey) return FALLBACK_REPLY;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openaiApiKey}`
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Recent conversation:\n${buildConversationContext(history)}\n\nCustomer message:\n${cleanMessage}`
          }
        ]
      })
    });

    if (!response.ok) return FALLBACK_REPLY;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const aiText = data.choices?.[0]?.message?.content?.trim();
    if (!aiText) return FALLBACK_REPLY;

    return sanitizeMultiline(aiText, 1000) || FALLBACK_REPLY;
  } catch {
    return FALLBACK_REPLY;
  }
}

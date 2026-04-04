import { env } from "../config/env.js";
import { LeadScore } from "../models/Booking.js";

export interface ProposalPlan {
  packageName: "Basic" | "Automation" | "Advanced";
  price: number;
  priceLabel: string;
  timeline: string;
}

function normalizeService(service: string) {
  return service.toLowerCase();
}

export function resolveProposalPlan(service: string): ProposalPlan {
  const normalized = normalizeService(service);

  if (
    normalized.includes("advanced") ||
    normalized.includes("full system") ||
    normalized.includes("ai") ||
    normalized.includes("fortress")
  ) {
    return {
      packageName: "Advanced",
      price: 100000,
      priceLabel: "INR 100,000+",
      timeline: "4-8 weeks"
    };
  }

  if (normalized.includes("automation")) {
    return {
      packageName: "Automation",
      price: 50000,
      priceLabel: "INR 50,000",
      timeline: "3-5 weeks"
    };
  }

  return {
    packageName: "Basic",
    price: 25000,
    priceLabel: "INR 25,000",
    timeline: "1-3 weeks"
  };
}

function rulesBasedScore(input: { budget?: number | null; businessType: string; message: string }): LeadScore {
  if ((input.budget ?? 0) > 50000) return "high";
  if (input.businessType.trim().toLowerCase() === "company") return "high";
  if (input.message.trim().length > 50) return "medium";
  return "low";
}

async function openAiScore(input: {
  budget?: number | null;
  businessType: string;
  message: string;
}): Promise<LeadScore | null> {
  if (!env.openaiApiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openaiApiKey}`
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You score leads as high, medium, or low. Reply with one word only: high, medium, or low."
          },
          {
            role: "user",
            content: `Budget: ${input.budget ?? "not shared"}\nBusiness type: ${input.businessType}\nMessage: ${input.message}`
          }
        ]
      })
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = payload.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (answer === "high" || answer === "medium" || answer === "low") return answer;
    return null;
  } catch {
    return null;
  }
}

export async function analyzeLead(input: {
  budget?: number | null;
  businessType: string;
  message: string;
}): Promise<{ score: LeadScore; source: "rules" | "openai" }> {
  const rulesScore = rulesBasedScore(input);
  const aiScore = await openAiScore(input);
  if (aiScore) {
    const rank: Record<LeadScore, number> = { low: 1, medium: 2, high: 3 };
    const resolvedScore = rank[aiScore] > rank[rulesScore] ? aiScore : rulesScore;
    return { score: resolvedScore, source: "openai" };
  }
  return { score: rulesScore, source: "rules" };
}

import { Router } from "express";
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from "../controllers/whatsapp.controller.js";
import { whatsappWebhookLimiter } from "../middleware/rateLimit.js";

export const whatsappWebhookRouter = Router();

// Direct Meta webhook endpoints.
// Useful if you want to verify with callback URL:
// https://<api-domain>/webhook/whatsapp
whatsappWebhookRouter.get("/webhook/whatsapp", verifyWhatsAppWebhook);
whatsappWebhookRouter.post("/webhook/whatsapp", whatsappWebhookLimiter, receiveWhatsAppWebhook);

// Backward-compatible alias used by monitoring scripts/docs.
whatsappWebhookRouter.get("/webhooks/whatsapp", verifyWhatsAppWebhook);
whatsappWebhookRouter.post("/webhooks/whatsapp", whatsappWebhookLimiter, receiveWhatsAppWebhook);

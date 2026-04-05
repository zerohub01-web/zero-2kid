import { Router } from "express";
import {
  getWhatsAppStatus,
  receiveWhatsAppWebhook,
  sendWhatsAppFromApi,
  verifyWhatsAppWebhook
} from "../controllers/whatsapp.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { whatsappSendLimiter, whatsappWebhookLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { whatsappSendSchema } from "../utils/validation.js";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", verifyWhatsAppWebhook);
whatsappRouter.post("/webhook", whatsappWebhookLimiter, receiveWhatsAppWebhook);
whatsappRouter.get("/status", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getWhatsAppStatus);

whatsappRouter.post(
  "/send",
  whatsappSendLimiter,
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(whatsappSendSchema),
  sendWhatsAppFromApi
);

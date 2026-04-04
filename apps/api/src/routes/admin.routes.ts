import { Router } from "express";
import { loginAdmin, loginAdminFromCustomer, logoutAdmin, me } from "../controllers/adminAuth.controller.js";
import { getAnalytics } from "../controllers/analytics.controller.js";
import { deleteBooking, getBookingDetails, getBookings, updateBookingStatus } from "../controllers/bookings.controller.js";
import { getCallBookings, updateCallBookingStatus } from "../controllers/calls.controller.js";
import { getFollowUps } from "../controllers/followUp.controller.js";
import { createService, deleteService, getServices, updateService } from "../controllers/services.controller.js";
import { createWork, deleteWork, getWork, updateWork } from "../controllers/work.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  bookingIdParamSchema,
  loginSchema,
  serviceSchema,
  updateChatStatusSchema,
  updateBookingSchema,
  updateCallBookingStatusSchema,
  updateMilestoneSchema,
  workSchema
} from "../utils/validation.js";
import { getCustomers } from "../controllers/customers.controller.js";
import { getActivityLogs } from "../controllers/activity.controller.js";
import { uploadAsset } from "../controllers/upload.controller.js";
import { getAdminProjectTimelines, updateMilestone } from "../controllers/projectTimeline.controller.js";
import { requireCustomerAuth } from "../middleware/customerAuth.js";
import { getChats, updateChatStatus } from "../controllers/chat.controller.js";

export const adminRouter = Router();

adminRouter.post("/login", authLimiter, validate(loginSchema), loginAdmin);
adminRouter.post("/customer-bridge", requireCustomerAuth, loginAdminFromCustomer);
adminRouter.post("/logout", requireAuth, logoutAdmin);
adminRouter.get("/me", requireAuth, me);

adminRouter.get("/analytics", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getAnalytics);
adminRouter.get("/customers", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getCustomers);
adminRouter.get("/activity", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getActivityLogs);
adminRouter.get("/projects", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getAdminProjectTimelines);
adminRouter.get("/chats", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getChats);
adminRouter.get("/followups", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getFollowUps);
adminRouter.get("/calls", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getCallBookings);
adminRouter.patch(
  "/calls/:id/status",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(updateCallBookingStatusSchema),
  updateCallBookingStatus
);
adminRouter.patch(
  "/chats/:id/status",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(updateChatStatusSchema),
  updateChatStatus
);
adminRouter.patch(
  "/projects/:bookingId/milestones/:milestoneKey",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(updateMilestoneSchema),
  updateMilestone
);

adminRouter.get("/bookings", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getBookings);
adminRouter.get("/leads", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getBookings);
adminRouter.get("/bookings/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getBookingDetails);
adminRouter.get("/leads/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getBookingDetails);
adminRouter.patch(
  "/bookings/:id",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(updateBookingSchema),
  updateBookingStatus
);
adminRouter.patch(
  "/leads/:id",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(updateBookingSchema),
  updateBookingStatus
);
adminRouter.delete(
  "/bookings/:id",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(bookingIdParamSchema),
  deleteBooking
);
adminRouter.delete(
  "/leads/:id",
  requireAuth,
  requireRole(["SUPER_ADMIN", "MANAGER"]),
  validate(bookingIdParamSchema),
  deleteBooking
);

adminRouter.get("/services", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getServices);
adminRouter.post("/services", requireAuth, requireRole(["SUPER_ADMIN"]), validate(serviceSchema), createService);
adminRouter.patch("/services/:id", requireAuth, requireRole(["SUPER_ADMIN"]), updateService);
adminRouter.delete("/services/:id", requireAuth, requireRole(["SUPER_ADMIN"]), deleteService);

adminRouter.get("/work", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getWork);
adminRouter.post("/work", requireAuth, requireRole(["SUPER_ADMIN"]), validate(workSchema), createWork);
adminRouter.patch("/work/:id", requireAuth, requireRole(["SUPER_ADMIN"]), updateWork);
adminRouter.delete("/work/:id", requireAuth, requireRole(["SUPER_ADMIN"]), deleteWork);

adminRouter.post("/upload", requireAuth, requireRole(["SUPER_ADMIN"]), uploadAsset);

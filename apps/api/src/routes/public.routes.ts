import { Router } from "express";
import { createBooking, getBookingStatus } from "../controllers/bookings.controller.js";
import { createCallBooking, getAvailableCallSlots } from "../controllers/calls.controller.js";
import { getLeadMemory } from "../controllers/leadMemory.controller.js";
import { getPublicServices } from "../controllers/services.controller.js";
import { getPublicWorks } from "../controllers/work.controller.js";
import { getPortalProject } from "../controllers/portal.controller.js";
import { validate } from "../middleware/validate.js";
import { bookingLimiter, leadLookupLimiter } from "../middleware/rateLimit.js";
import {
  bookingStatusLookupSchema,
  callSlotsQuerySchema,
  createBookingSchema,
  createCallBookingSchema,
  leadMemoryLookupSchema
} from "../utils/validation.js";
import { requireCustomerAuth } from "../middleware/customerAuth.js";
import { WorkModel } from "../models/Work.js";

export const publicRouter = Router();

publicRouter.get("/services", getPublicServices);
publicRouter.get("/work", getPublicWorks);
publicRouter.post("/bookings", bookingLimiter, validate(createBookingSchema), createBooking);
publicRouter.post("/leads", bookingLimiter, validate(createBookingSchema), createBooking);
publicRouter.get("/leads/memory", leadLookupLimiter, validate(leadMemoryLookupSchema), getLeadMemory);
publicRouter.get("/bookings/status/:bookingId", validate(bookingStatusLookupSchema), getBookingStatus);
publicRouter.get("/leads/status/:bookingId", validate(bookingStatusLookupSchema), getBookingStatus);
publicRouter.get("/calls/slots", validate(callSlotsQuerySchema), getAvailableCallSlots);
publicRouter.post("/calls/book", bookingLimiter, validate(createCallBookingSchema), createCallBooking);
publicRouter.get("/portal/project", requireCustomerAuth, getPortalProject);
publicRouter.get("/projects", requireCustomerAuth, async (_req, res) => {
  try {
    const items = await WorkModel.find().maxTimeMS(5000).select("-__v").sort({ createdAt: -1 });
    return res.json({ projects: items });
  } catch (error) {
    if (error instanceof Error && error.message.includes("buffering timed out")) {
      return res.status(503).json({
        code: "db_unavailable",
        error: "Database connection temporarily unavailable. Please try again."
      });
    }

    return res.status(500).json({
      code: "internal_error",
      error: "Internal server error"
    });
  }
});

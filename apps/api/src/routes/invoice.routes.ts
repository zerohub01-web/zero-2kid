import { NextFunction, Request, Response, Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  getPublicInvoiceView,
  invoiceDashboardStats,
  listInvoices,
  sendInvoice,
  signInvoice,
  updateInvoice
} from "../controllers/invoice.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { verifyToken } from "../utils/auth.js";
import { verifyPortalToken } from "../utils/portalToken.js";

const publicInvoiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many invoice requests. Please try again later." }
});

export const invoiceRouter = Router();

function hasAdminAccess(req: Request) {
  const token = req.cookies?.token;
  if (!token) return false;

  try {
    const payload = verifyToken(token);
    return payload.token_type === "admin" && Boolean(payload.adminId);
  } catch {
    return false;
  }
}

const requirePortalToken =
  (action: "view" | "sign" | "pdf") =>
  (req: Request, res: Response, next: NextFunction) => {
    if (hasAdminAccess(req)) {
      return next();
    }

    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token || !verifyPortalToken(token, req.params.id, action)) {
      return res.status(401).json({ error: "Invalid or expired access link" });
    }

    next();
  };

invoiceRouter.get("/api/invoices", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), listInvoices);
invoiceRouter.post("/api/invoices", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), createInvoice);
invoiceRouter.get("/api/invoices/stats/overview", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), invoiceDashboardStats);
invoiceRouter.get("/api/invoices/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getInvoice);
invoiceRouter.patch("/api/invoices/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), updateInvoice);
invoiceRouter.delete("/api/invoices/:id", requireAuth, requireRole(["SUPER_ADMIN"]), deleteInvoice);
invoiceRouter.post("/api/invoices/:id/send", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), sendInvoice);
invoiceRouter.post("/api/invoices/:id/sign", requirePortalToken("sign"), signInvoice);
invoiceRouter.get("/api/invoices/:id/pdf", requirePortalToken("pdf"), downloadInvoicePdf);

invoiceRouter.get("/portal/invoice/:id", publicInvoiceLimiter, requirePortalToken("view"), getPublicInvoiceView);

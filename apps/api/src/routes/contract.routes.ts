import { NextFunction, Request, Response, Router } from "express";
import rateLimit from "express-rate-limit";
import {
  contractDashboardStats,
  createContract,
  createContractFromBooking,
  deleteContract,
  downloadContractPdf,
  getContract,
  getContractSettings,
  getPublicContractView,
  listContracts,
  sendContract,
  signContract,
  updateContract,
  updateContractSettings
} from "../controllers/contract.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { verifyToken } from "../utils/auth.js";
import { verifyPortalToken } from "../utils/portalToken.js";

const publicContractLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many contract requests. Please try again later." }
});

export const contractRouter = Router();

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

contractRouter.get("/api/contracts/settings", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getContractSettings);
contractRouter.put("/api/contracts/settings", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), updateContractSettings);

contractRouter.get("/api/contracts", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), listContracts);
contractRouter.post("/api/contracts", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), createContract);
contractRouter.get("/api/contracts/stats/overview", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), contractDashboardStats);
contractRouter.post("/api/contracts/from-booking/:bookingId", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), createContractFromBooking);
contractRouter.get("/api/contracts/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), getContract);
contractRouter.patch("/api/contracts/:id", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), updateContract);
contractRouter.delete("/api/contracts/:id", requireAuth, requireRole(["SUPER_ADMIN"]), deleteContract);
contractRouter.post("/api/contracts/:id/send", requireAuth, requireRole(["SUPER_ADMIN", "MANAGER"]), sendContract);
contractRouter.post("/api/contracts/:id/sign", requirePortalToken("sign"), signContract);
contractRouter.get("/api/contracts/:id/pdf", requirePortalToken("pdf"), downloadContractPdf);
contractRouter.get("/api/contracts/public/:id", publicContractLimiter, requirePortalToken("view"), getPublicContractView);

contractRouter.get("/portal/contract/:id", publicContractLimiter, requirePortalToken("view"), getPublicContractView);

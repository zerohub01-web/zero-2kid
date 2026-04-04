import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth.js";
import { Role } from "../types/auth.js";

declare module "express-serve-static-core" {
  interface Request {
    admin?: { adminId: string; role: Role; token_type: "admin" };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = verifyToken(token);
    if (payload.token_type !== "admin" || !payload.adminId) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.admin = { adminId: payload.adminId, role: payload.role, token_type: payload.token_type };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin || !allowed.includes(req.admin.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

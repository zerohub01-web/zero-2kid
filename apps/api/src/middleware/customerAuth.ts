import { Request, Response, NextFunction } from "express";
import { verifyCustomerToken } from "../utils/customerAuth.js";

declare module "express-serve-static-core" {
  interface Request {
    customer?: { customerId: string; email: string };
  }
}

export function requireCustomerAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.customer_token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = verifyCustomerToken(token);
    if (payload.token_type !== "customer" || !payload.customerId) {
      return res.status(403).json({ error: "Customer access required" });
    }

    req.customer = { customerId: payload.customerId, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

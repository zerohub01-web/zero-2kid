import { Router } from "express";
import {
  debugCustomerSession,
  getCustomerProjects,
  loginCustomer,
  loginWithGoogle,
  logoutCustomer,
  meCustomer,
  postClientComment,
  signupCustomer,
  verifyEmail
} from "../controllers/customerAuth.controller.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireCustomerAuth } from "../middleware/customerAuth.js";
import { validate } from "../middleware/validate.js";
import { customerGoogleSchema, customerLoginSchema, customerSignupSchema } from "../utils/validation.js";

export const authRouter = Router();

authRouter.post("/signup", authLimiter, validate(customerSignupSchema), signupCustomer);
authRouter.post("/login", authLimiter, validate(customerLoginSchema), loginCustomer);
authRouter.post("/client-login", authLimiter, validate(customerLoginSchema), loginCustomer);
authRouter.post("/google", authLimiter, validate(customerGoogleSchema), loginWithGoogle);
authRouter.post("/verify-email", authLimiter, verifyEmail);
authRouter.get(
  "/debug-session",
  (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }
    next();
  },
  debugCustomerSession
);

authRouter.get("/me", requireCustomerAuth, meCustomer);
authRouter.post("/logout", requireCustomerAuth, logoutCustomer);
authRouter.get("/projects", requireCustomerAuth, getCustomerProjects);
authRouter.get("/client-dashboard", requireCustomerAuth, getCustomerProjects);
authRouter.post("/projects/:bookingId/milestones/:milestoneKey/comment", requireCustomerAuth, postClientComment);


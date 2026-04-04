import { Router } from "express";
import {
  approveReview,
  deleteReview,
  getAllReviews,
  getApprovedReviews,
  getOwnReview,
  getReviews,
  rejectReview,
  submitReview,
  updateReviewStatus
} from "../controllers/review.controller.js";
import { requireCustomerAuth } from "../middleware/customerAuth.js";
import { requireAuth as requireAdminAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", getReviews);
router.get("/public", getApprovedReviews);

router.post("/", requireCustomerAuth, submitReview);
router.get("/mine", requireCustomerAuth, getOwnReview);

router.get("/admin/all", requireAdminAuth, getAllReviews);
router.patch("/:id", requireAdminAuth, updateReviewStatus);
router.delete("/:id", requireAdminAuth, deleteReview);

router.patch("/admin/:id/approve", requireAdminAuth, approveReview);
router.patch("/admin/:id/reject", requireAdminAuth, rejectReview);
router.delete("/admin/:id", requireAdminAuth, deleteReview);

export default router;

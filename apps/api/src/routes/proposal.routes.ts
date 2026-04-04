import fs from "node:fs";
import mongoose from "mongoose";
import { Router } from "express";
import { BookingModel } from "../models/Booking.js";
import { resolveProposalPdfForBooking } from "../services/proposal.service.js";

export const proposalRouter = Router();

proposalRouter.get("/:id/pdf", async (req, res) => {
  try {
    const rawId = String(req.params.id ?? "").trim();
    if (!rawId) {
      return res.status(400).json({ error: "Proposal id is required" });
    }

    const booking = mongoose.isValidObjectId(rawId)
      ? await BookingModel.findById(rawId)
      : await BookingModel.findOne({ bookingId: rawId.toUpperCase() });

    if (!booking) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    const proposalFile = await resolveProposalPdfForBooking(booking.bookingId, booking.proposalUrl);
    if (!proposalFile) {
      return res.status(404).json({ error: "PDF file not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${proposalFile.fileName}"`);
    fs.createReadStream(proposalFile.filePath).pipe(res);
  } catch (error) {
    console.error("Get proposal PDF failed:", error);
    return res.status(500).json({ error: "Failed to load proposal PDF" });
  }
});

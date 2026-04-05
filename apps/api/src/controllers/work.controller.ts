import { Request, Response } from "express";
import { WorkModel } from "../models/Work.js";
import { logActivity } from "../services/activity.service.js";

export async function createWork(req: Request, res: Response) {
  const work = await WorkModel.create(req.body);
  await logActivity("WORK_CREATED", req.admin?.adminId ?? "system", { workId: String(work._id) });
  return res.status(201).json(work);
}

export async function getWork(_req: Request, res: Response) {
  try {
    const items = await WorkModel.find().maxTimeMS(5000).sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    if (error instanceof Error && error.message.includes("buffering timed out")) {
      console.error("[DB Timeout] WorkModel.find() failed:", error.message);
      return res.status(503).json({
        code: "db_unavailable",
        error: "Database connection temporarily unavailable. Please try again."
      });
    }

    console.error("[Work Error]", error);
    return res.status(500).json({
      code: "internal_error",
      error: "Internal server error"
    });
  }
}

export async function updateWork(req: Request, res: Response) {
  const work = await WorkModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!work) return res.status(404).json({ message: "Work not found" });

  await logActivity("WORK_UPDATED", req.admin?.adminId ?? "system", { workId: String(work._id) });
  return res.json(work);
}

export async function deleteWork(req: Request, res: Response) {
  const work = await WorkModel.findByIdAndDelete(req.params.id);
  if (!work) return res.status(404).json({ message: "Work not found" });

  await logActivity("WORK_DELETED", req.admin?.adminId ?? "system", { workId: String(work._id) });
  return res.json({ ok: true });
}

export async function getPublicWorks(_req: Request, res: Response) {
  try {
    const items = await WorkModel.find().maxTimeMS(5000).select("-__v").sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    if (error instanceof Error && error.message.includes("buffering timed out")) {
      console.error("[DB Timeout] Public WorkModel.find() failed:", error.message);
      return res.status(503).json({
        code: "db_unavailable",
        error: "Database connection temporarily unavailable. Please try again."
      });
    }

    console.error("[Public Work Error]", error);
    return res.status(500).json({
      code: "internal_error",
      error: "Internal server error"
    });
  }
}

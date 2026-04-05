import { Request, Response } from "express";
import { ServiceModel } from "../models/Service.js";
import { logActivity } from "../services/activity.service.js";

export async function createService(req: Request, res: Response) {
  const service = await ServiceModel.create(req.body);
  await logActivity("SERVICE_CREATED", req.admin?.adminId ?? "system", { serviceId: String(service._id) });
  return res.status(201).json(service);
}

export async function getServices(_req: Request, res: Response) {
  try {
    const services = await ServiceModel.find().maxTimeMS(5000).sort({ createdAt: -1 });
    return res.json(services);
  } catch (error) {
    if (error instanceof Error && error.message.includes("buffering timed out")) {
      console.error("[DB Timeout] ServiceModel.find() failed:", error.message);
      return res.status(503).json({
        code: "db_unavailable",
        error: "Database connection temporarily unavailable. Please try again."
      });
    }

    console.error("[Services Error]", error);
    return res.status(500).json({
      code: "internal_error",
      error: "Internal server error"
    });
  }
}

export async function getPublicServices(_req: Request, res: Response) {
  try {
    const services = await ServiceModel.find({ isActive: true }).maxTimeMS(5000).sort({ createdAt: -1 });
    return res.json(services);
  } catch (error) {
    if (error instanceof Error && error.message.includes("buffering timed out")) {
      console.error("[DB Timeout] Public ServiceModel.find() failed:", error.message);
      return res.status(503).json({
        code: "db_unavailable",
        error: "Database connection temporarily unavailable. Please try again."
      });
    }

    console.error("[Public Services Error]", error);
    return res.status(500).json({
      code: "internal_error",
      error: "Internal server error"
    });
  }
}

export async function updateService(req: Request, res: Response) {
  const service = await ServiceModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) return res.status(404).json({ message: "Service not found" });

  await logActivity("SERVICE_UPDATED", req.admin?.adminId ?? "system", { serviceId: String(service._id) });
  return res.json(service);
}

export async function deleteService(req: Request, res: Response) {
  const deleted = await ServiceModel.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Service not found" });

  await logActivity("SERVICE_DELETED", req.admin?.adminId ?? "system", { serviceId: String(deleted._id) });
  return res.json({ ok: true });
}

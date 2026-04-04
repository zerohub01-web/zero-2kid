import { Request, Response } from "express";
import { ActivityLogModel } from "../models/ActivityLog.js";
import { serializeActivityLog } from "../services/activity.service.js";

export async function getActivityLogs(_req: Request, res: Response) {
  const logs = await ActivityLogModel.find().sort({ timestamp: -1 }).limit(100);
  return res.json(logs.map((log) => serializeActivityLog(log)));
}

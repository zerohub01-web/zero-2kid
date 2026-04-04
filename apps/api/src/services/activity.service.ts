import { ActivityLogModel, type ActivityLogDocument } from "../models/ActivityLog.js";

export const ACTION_LABELS: Record<string, string> = {
  ADMIN_LOGIN_CUSTOMER_BRIDGE: "Admin logged in",
  ASSET_UPLOADED: "Asset uploaded",
  BOOKING_CREATED: "New booking received",
  BOOKING_DELETED: "Booking deleted",
  BOOKING_STATUS_CHANGED: "Booking status updated",
  CONTRACT_SENT: "Contract sent to client",
  CONTRACT_SIGNED: "Client signed contract",
  INVOICE_SENT: "Invoice sent to client",
  LEAD_AUTOMATION_COMPLETED: "Lead automation completed",
  LEAD_CAPTURED: "New lead captured",
  PROJECT_MILESTONE_UPDATED: "Project milestone updated",
  REVIEW_APPROVED: "Client review approved",
  REVIEW_REJECTED: "Client review rejected",
  REVIEW_SUBMITTED: "Client review submitted"
};

export function getActivityLabel(action: string) {
  return ACTION_LABELS[action] || action.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

export function serializeActivityLog(log: ActivityLogDocument) {
  return {
    _id: String(log._id),
    action: log.action,
    actionLabel: getActivityLabel(log.action),
    performedBy: log.performedBy,
    userEmail: log.performedBy,
    metadata: log.metadata ?? {},
    timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString(),
    createdAt: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString()
  };
}

export async function logActivity(action: string, performedBy: string, metadata?: Record<string, unknown>) {
  await ActivityLogModel.create({ action, performedBy, metadata });
}

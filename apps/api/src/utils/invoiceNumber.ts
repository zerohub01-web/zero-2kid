import type { Model } from "mongoose";
import type { Invoice } from "../db/schema.js";

export async function generateInvoiceNumber(db: Model<Invoice>): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.countDocuments({
    invoiceNumber: { $regex: `^ZERO-${year}-` }
  });

  const seq = String(count + 1).padStart(3, "0");
  return `ZERO-${year}-${seq}`;
}

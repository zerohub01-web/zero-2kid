import type { Model } from "mongoose";
import type { Contract } from "../db/schema.js";

export async function generateContractNumber(db: Model<Contract>): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.countDocuments({
    contractNumber: { $regex: `^ZERO-CONTRACT-${year}-` }
  });
  const seq = String(count + 1).padStart(3, "0");
  return `ZERO-CONTRACT-${year}-${seq}`;
}

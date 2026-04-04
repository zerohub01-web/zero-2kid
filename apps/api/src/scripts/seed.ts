import "../config/env.js";
import { connectDb } from "../config/db.js";
import { AdminModel } from "../models/Admin.js";
import { ServiceModel } from "../models/Service.js";

async function seed() {
  await connectDb();

  const adminId = process.env.SEED_ADMIN_ID ?? "zero_root";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change_me_now";

  const existingAdmin = await AdminModel.findOne({ adminId });
  if (!existingAdmin) {
    await AdminModel.create({ adminId, password, role: "SUPER_ADMIN" });
    // eslint-disable-next-line no-console
    console.log(`Created SUPER_ADMIN: ${adminId}`);
  }

  const defaults = [
    { title: "Brand Operating System", price: 2500, isActive: true },
    { title: "Digital Marketing Growth Ops", price: 30000, isActive: true },
    { title: "Automation Architecture", price: 3500, isActive: true },
    { title: "Growth Intelligence Stack", price: 4200, isActive: true }
  ];

  for (const item of defaults) {
    await ServiceModel.updateOne({ title: item.title }, { $setOnInsert: item }, { upsert: true });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete");
  process.exit(0);
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

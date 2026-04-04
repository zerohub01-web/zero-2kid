import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startLeadFollowUpWorker } from "./services/leadFollowUp.service.js";
import { startChatFollowUpWorker } from "./services/chatFollowUp.service.js";
import { startCallReminderWorker } from "./services/callReminder.service.js";

// v3 - Trigger render restart for OTP email verification

async function bootstrap() {
  let dbConnected = false;
  try {
    await connectDb();
    dbConnected = true;
  } catch (err) {
    console.error("Database connection failed. Starting web server anyway to avoid timeouts...", err);
  }
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${env.port}`);
  });
  if (dbConnected) {
    startLeadFollowUpWorker();
    startChatFollowUpWorker();
    startCallReminderWorker();
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});

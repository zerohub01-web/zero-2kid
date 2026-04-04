import { processUpcomingCallReminders } from "../controllers/calls.controller.js";

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
let reminderTimer: NodeJS.Timeout | null = null;

export function startCallReminderWorker(intervalMs = DEFAULT_INTERVAL_MS) {
  if (reminderTimer) return;

  void processUpcomingCallReminders().catch((error) => {
    console.error("Call reminder initial run failed:", error);
  });

  reminderTimer = setInterval(() => {
    void processUpcomingCallReminders().catch((error) => {
      console.error("Call reminder worker error:", error);
    });
  }, intervalMs);

  reminderTimer.unref?.();
}

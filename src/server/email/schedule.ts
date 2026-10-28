import { db } from "~/server/db";
import { createChildLogger } from "~/utils/logger";
import { emailConfigured } from "./mailer";
import { runReminders } from "./reminders";

const log = createChildLogger("reminders");
const HOUR = 3600_000;

/**
 * Runs the reminder emails a few minutes after the server starts, then
 * hourly. Safe with more than one server: the email log claims each send.
 */
export function startReminderSchedule() {
  const g = globalThis as { __reminders?: boolean };
  if (g.__reminders) return;
  g.__reminders = true;
  let warned = false;
  const tick = async () => {
    try {
      if (!warned && !(await emailConfigured())) {
        warned = true;
        log.warn("No email server (EMAIL_SERVER_* or Admin › Settings): reminder emails wait until one is set up");
      }
      const run = await runReminders(db);
      if (run.nudged || run.opened || run.giftCheckIns || run.newLists) log.info(run, "Reminder emails processed");
    } catch (error) {
      log.error({ error: error instanceof Error ? error.message : String(error) }, "Reminder run failed");
    }
  };
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), HOUR).unref();
  }, 3 * 60_000).unref();
}

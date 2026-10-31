import { deleteInactiveAccounts } from "~/server/account";
import { db } from "~/server/db";
import { TEST_EMAIL_DOMAIN } from "~/server/utils/test-auth";
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
    // Day 30: accounts unused for 24 months are deleted (privacy policy)
    try {
      // (test users are left to the e2e runs; accounts without an email count)
      await deleteInactiveAccounts(db, {
        only: { OR: [{ email: null }, { NOT: { email: { endsWith: TEST_EMAIL_DOMAIN } } }] },
      });
    } catch (error) {
      log.error({ error: error instanceof Error ? error.message : String(error) }, "Inactive account clean-up failed");
    }
  };
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), HOUR).unref();
  }, 3 * 60_000).unref();
}

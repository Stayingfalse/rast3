/** Server start (Next.js instrumentation): schedule the reminder emails. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.REMINDER_EMAILS === "off") return;
  const { startReminderSchedule } = await import("./server/email/schedule");
  startReminderSchedule();
}

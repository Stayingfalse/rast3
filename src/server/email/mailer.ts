import type { EmailKind, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { createTransport, type Transporter } from "nodemailer";

import { TEST_EMAIL_DOMAIN } from "~/server/utils/test-auth";
import { emailSettings } from "./smtp";
import { oneClickUrl, siteUrl } from "./unsubscribe";

/**
 * Reminder emails (22 Oct). Each one is logged before it's sent: the log's
 * unique key (person, kind, season, ref) claims it, so it goes once even if
 * the job runs twice or two servers overlap during a deploy. Test addresses
 * are logged as skipped and never sent.
 *
 * Pre-launch review (26 Oct): most of these go once a season, so a claim is
 * only kept for an email that actually went. Without an email server nothing is
 * claimed (so they all go once one is set up), and a failed send gives its claim
 * back, so the next hourly run tries again.
 */
type Db = Pick<PrismaClient, "emailLog">;

/**
 * The same email server as sign-in links (see ./smtp): the environment's, or
 * the one set up in Admin › Settings. Re-read every few minutes, so a change
 * there (e.g. a new Gmail authorisation) is picked up without a restart.
 */
const SETTINGS_TTL = 5 * 60_000;
let cached: { at: number; value: { transport: Transporter; from: string | undefined } | null } | null =
  null;
async function getTransport() {
  if (cached && Date.now() - cached.at < SETTINGS_TTL) return cached.value;
  const settings = await emailSettings();
  cached = {
    at: Date.now(),
    value: settings && { transport: createTransport(settings.server), from: settings.from },
  };
  return cached.value;
}

/** Is there an email server to send reminders with? */
export const emailConfigured = async () => !!(await getTransport());

/** Test and example addresses never get real email. */
export const isTestAddress = (email: string) =>
  /\.(test|example|invalid|localhost)$/i.test(email.split("@")[1] ?? "") ||
  email.toLowerCase().endsWith(TEST_EMAIL_DOMAIN);

export type Message = { subject: string; html: string; text: string };

/** The last send error, for the run's log line. */
export let lastError: string | null = null;

export async function sendOnce(
  db: Db,
  to: { id: string; email: string },
  kind: EmailKind,
  season: number,
  build: () => Message,
  ref = "",
): Promise<"SENT" | "SKIPPED" | "FAILED" | "DUPLICATE" | "NO_SMTP"> {
  const test = isTestAddress(to.email);
  const smtp = test ? null : await getTransport();
  if (!test && !smtp) return "NO_SMTP";
  let logId: string;
  try {
    ({ id: logId } = await db.emailLog.create({
      data: { userId: to.id, kind, season, ref },
      select: { id: true },
    }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "DUPLICATE";
    throw e;
  }
  if (test || !smtp) {
    await db.emailLog.update({ where: { id: logId }, data: { status: "SKIPPED", note: "test address" } });
    return "SKIPPED";
  }
  const message = build();
  const unsubscribe = oneClickUrl(to.id);
  try {
    await smtp.transport.sendMail({
      to: to.email,
      from: smtp.from,
      subject: message.subject,
      html: message.html,
      text: message.text,
      // one-click unsubscribe (RFC 8058), shown by Gmail and others
      headers: {
        "List-Unsubscribe": `<${unsubscribe}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    await db.emailLog.update({ where: { id: logId }, data: { status: "SENT" } });
    return "SENT";
  } catch (e) {
    // give the claim back: the next run tries again
    await db.emailLog.delete({ where: { id: logId } });
    lastError = (e instanceof Error ? e.message : String(e)).slice(0, 190);
    return "FAILED";
  }
}

export { siteUrl };

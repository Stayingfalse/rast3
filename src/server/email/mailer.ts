import type { EmailKind, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { createTransport, type Transporter } from "nodemailer";

import { TEST_EMAIL_DOMAIN } from "~/server/utils/test-auth";
import { oneClickUrl, siteUrl } from "./unsubscribe";

/**
 * Reminder emails (22 Oct). Each one is logged before it's sent: the log's
 * unique key (person, kind, season, ref) claims it, so it goes once even if
 * the job runs twice or two servers overlap during a deploy. Without SMTP
 * (dev) or for test addresses, it's logged as skipped and nothing is sent.
 */
type Db = Pick<PrismaClient, "emailLog">;

let transport: Transporter | null | undefined;
function getTransport() {
  if (transport !== undefined) return transport;
  transport = process.env.EMAIL_SERVER_HOST
    ? createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587"),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      })
    : null;
  return transport;
}

/** Test and example addresses never get real email. */
export const isTestAddress = (email: string) =>
  /\.(test|example|invalid|localhost)$/i.test(email.split("@")[1] ?? "") ||
  email.toLowerCase().endsWith(TEST_EMAIL_DOMAIN);

export type Message = { subject: string; html: string; text: string };

export async function sendOnce(
  db: Db,
  to: { id: string; email: string },
  kind: EmailKind,
  season: number,
  build: () => Message,
  ref = "",
): Promise<"SENT" | "SKIPPED" | "FAILED" | "DUPLICATE"> {
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
  const smtp = getTransport();
  const skip = isTestAddress(to.email) ? "test address" : !smtp ? "no SMTP configured" : null;
  if (skip || !smtp) {
    await db.emailLog.update({ where: { id: logId }, data: { status: "SKIPPED", note: skip } });
    return "SKIPPED";
  }
  const message = build();
  const unsubscribe = oneClickUrl(to.id);
  try {
    await smtp.sendMail({
      to: to.email,
      from: process.env.EMAIL_FROM,
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
    await db.emailLog.update({
      where: { id: logId },
      data: { status: "FAILED", note: (e instanceof Error ? e.message : String(e)).slice(0, 190) },
    });
    return "FAILED";
  }
}

export { siteUrl };

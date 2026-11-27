import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";
import { z } from "zod";

import { db } from "~/server/db";
import { emailSettings } from "~/server/email/smtp";
import { checkInNudge, giftCheckIn, seasonOpen, wishlistProblem } from "~/server/email/templates";
import { oneClickUrl } from "~/server/email/unsubscribe";
import { currentSeason, seasonWindow } from "~/server/season";
import { isTestAuthAuthorised, TEST_EMAIL_DOMAIN } from "~/server/utils/test-auth";

/**
 * Test-only (same gate as ../login): dev's test mailbox (26 Nov). Dev sends
 * its email to Mailpit (ras/mailpit), which catches everything and delivers
 * nothing, so e2e can open real emails and follow their links: the 15-26 Nov
 * email bugs (an expired Gmail token, Outlook's button, every link under
 * /api/auth) all hid in the sending path no test could reach.
 *
 * GET    ?to=<test address>  -> the emails sent to it, newest first, with their links
 * POST   { to, template }    -> send one of our real emails to a test address
 * DELETE ?to=<test address>  -> forget its emails
 *
 * Test addresses only (@…e2e.raosanta.test).
 */
const MAILPIT = () => (process.env.MAILPIT_API_URL ?? "http://ras_mailpit:8025").replace(/\/$/, "");
const notFound = () => new NextResponse("Not Found", { status: 404 });
const testAddress = z
  .string()
  .email()
  .transform((s) => s.toLowerCase())
  .refine((s) => s.endsWith(TEST_EMAIL_DOMAIN), "Test addresses only");

type Summary = { ID: string; Subject: string; Created: string; To: { Address: string }[] };
type Full = { HTML: string; Text: string; Subject: string; From: { Address: string } };

const search = (to: string) => `query=${encodeURIComponent(`to:"${to}"`)}`;

/** Every http(s) link in the email, from its HTML (href) and its text. */
function linksOf(m: Full) {
  const found = new Set<string>();
  for (const [, href] of m.HTML.matchAll(/href="([^"]+)"/g)) if (href) found.add(href.replaceAll("&amp;", "&"));
  for (const [url] of m.Text.matchAll(/https?:\/\/[^\s<>"]+/g)) found.add(url);
  return [...found].filter((u) => /^https?:\/\//.test(u));
}

export async function GET(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();
  const to = testAddress.safeParse(req.nextUrl.searchParams.get("to"));
  if (!to.success) return NextResponse.json({ error: "?to= must be a test address" }, { status: 400 });
  const list = await fetch(`${MAILPIT()}/api/v1/search?${search(to.data)}&limit=20`);
  if (!list.ok) return NextResponse.json({ error: `Mailpit: ${list.status}` }, { status: 502 });
  const { messages } = (await list.json()) as { messages: Summary[] };
  const full = await Promise.all(
    messages.map(async (s) => {
      const m = (await (await fetch(`${MAILPIT()}/api/v1/message/${s.ID}`)).json()) as Full;
      return { id: s.ID, subject: m.Subject, from: m.From.Address, at: s.Created, text: m.Text, links: linksOf(m) };
    }),
  );
  return NextResponse.json({ messages: full });
}

const sendBody = z.object({
  to: testAddress,
  template: z.enum(["seasonOpen", "checkInNudge", "giftCheckIn", "wishlistProblem"]),
});

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();
  const input = sendBody.safeParse(await req.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: input.error.message }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: input.data.to }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "No such test user (log in as them first)" }, { status: 404 });
  const settings = await emailSettings();
  if (!settings) return NextResponse.json({ error: "No email server" }, { status: 409 });
  const season = currentSeason();
  const w = await seasonWindow(db);
  const message =
    input.data.template === "seasonOpen"
      ? seasonOpen(user.id, season, w.closesAt, true)
      : input.data.template === "checkInNudge"
        ? checkInNudge(user.id, season, w.opensAt)
        : input.data.template === "giftCheckIn"
          ? giftCheckIn(user.id, season, "test-purchase")
          : wishlistProblem(user.id, season, 2, ["NO_ADDRESS", "DOESNT_EXIST"]);
  // as the reminders send it (mailer.sendOnce), minus the email log
  await createTransport(settings.server).sendMail({
    to: input.data.to,
    from: settings.from,
    subject: message.subject,
    html: message.html,
    text: message.text,
    headers: {
      "List-Unsubscribe": `<${oneClickUrl(user.id)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  return NextResponse.json({ sent: message.subject });
}

export async function DELETE(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();
  const to = testAddress.safeParse(req.nextUrl.searchParams.get("to"));
  if (!to.success) return NextResponse.json({ error: "?to= must be a test address" }, { status: 400 });
  const r = await fetch(`${MAILPIT()}/api/v1/search?${search(to.data)}`, { method: "DELETE" });
  return NextResponse.json({ ok: r.ok });
}

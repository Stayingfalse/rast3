import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";
import { runReminders } from "~/server/email/reminders";
import { unsubscribeToken } from "~/server/email/unsubscribe";
import { arrivalPath } from "~/server/gifts";
import { currentSeason, seasonWindow } from "~/server/season";
import { seasonRange } from "~/server/stamps";
import { isTestAuthAuthorised, testDomain } from "~/server/utils/test-auth";

/**
 * Test-only (same gate as ../login): run the reminder emails at a pretend
 * time for this run's test users only, and read back their email log. Test
 * addresses are never emailed, so every entry is "SKIPPED (test address)".
 *
 * ageGifts: first make this run's gifts that many days old (gifts only show
 * to the person they were for after a few days).
 *
 * backdate: these test users' profiles become last year's (a returning
 * member who hasn't checked in yet).
 *
 * POST { now?: ISO date, run?: boolean, ageGifts?: days, backdate?: emails } -> { window, run, log, tokens }
 */
const body = z.object({
  now: z.string().datetime().optional(),
  run: z.boolean().default(true),
  ageGifts: z.number().int().min(0).max(60).optional(),
  backdate: z.array(z.string()).max(20).optional(),
});

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return new NextResponse("Not Found", { status: 404 });
  const input = body.safeParse(await req.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: input.error.message }, { status: 400 });
  const only = { email: { endsWith: `@${testDomain(req)}` } };
  if (input.data.ageGifts !== undefined) {
    await db.purchase.updateMany({
      where: { user: only },
      data: { purchasedAt: new Date(Date.now() - input.data.ageGifts * 24 * 3600_000) },
    });
  }

  if (input.data.backdate?.length) {
    const lastYear = seasonRange(currentSeason() - 1).gte;
    await db.user.updateMany({
      where: { AND: [only, { email: { in: input.data.backdate } }] },
      data: { profileCompletedAt: lastYear },
    });
  }

  const run = input.data.run
    ? await runReminders(db, { now: input.data.now ? new Date(input.data.now) : undefined, only })
    : null;
  const log = await db.emailLog.findMany({
    where: { user: only },
    orderBy: { createdAt: "asc" },
    select: { kind: true, status: true, note: true, ref: true, user: { select: { id: true, email: true } } },
  });
  return NextResponse.json({
    window: await seasonWindow(db),
    run,
    log: log.map((l) => ({
      kind: l.kind,
      status: l.status,
      note: l.note,
      ref: l.ref,
      email: l.user.email,
      // the check-in email's "something's arrived" link
      ...(l.kind === "GIFT_CHECK_IN" && l.ref ? { arrived: arrivalPath(l.ref) } : {}),
    })),
    // unsubscribe links for these users, so tests can follow one
    tokens: Object.fromEntries(
      log.map((l): [string, { u: string; t: string }] => [
        l.user.email ?? "",
        { u: l.user.id, t: unsubscribeToken(l.user.id) },
      ]),
    ),
  });
}

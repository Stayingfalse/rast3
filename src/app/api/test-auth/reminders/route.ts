import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";
import { runReminders } from "~/server/email/reminders";
import { unsubscribeToken } from "~/server/email/unsubscribe";
import { seasonWindow } from "~/server/season";
import { isTestAuthAuthorised, testDomain } from "~/server/utils/test-auth";

/**
 * Test-only (same gate as ../login): run the reminder emails at a pretend
 * time for this run's test users only, and read back their email log. Test
 * addresses are never emailed, so every entry is "SKIPPED (test address)".
 *
 * POST { now?: ISO date, run?: boolean } -> { window, run, log, tokens }
 */
const body = z.object({ now: z.string().datetime().optional(), run: z.boolean().default(true) });

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return new NextResponse("Not Found", { status: 404 });
  const input = body.safeParse(await req.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: input.error.message }, { status: 400 });
  const only = { email: { endsWith: `@${testDomain(req)}` } };

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
    log: log.map((l) => ({ kind: l.kind, status: l.status, note: l.note, ref: l.ref, email: l.user.email })),
    // unsubscribe links for these users, so tests can follow one
    tokens: Object.fromEntries(
      log.map((l): [string, { u: string; t: string }] => [
        l.user.email ?? "",
        { u: l.user.id, t: unsubscribeToken(l.user.id) },
      ]),
    ),
  });
}

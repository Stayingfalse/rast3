import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteInactiveAccounts } from "~/server/account";
import { db } from "~/server/db";
import { isTestAuthAuthorised, testDomain } from "~/server/utils/test-auth";

/**
 * Test-only (same gate as ../login): set when this run's test users were
 * last seen, run the 24-month inactive deletion for them only, and list who
 * is left.
 *
 * POST { lastSeen?: { [email]: ISO date }, run?: boolean } -> { deleted, left }
 */
const body = z.object({
  lastSeen: z.record(z.string(), z.string().datetime()).optional(),
  run: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return new NextResponse("Not Found", { status: 404 });
  const input = body.safeParse(await req.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: input.error.message }, { status: 400 });
  const only = { email: { endsWith: `@${testDomain(req)}` } };

  for (const [email, at] of Object.entries(input.data.lastSeen ?? {})) {
    await db.user.updateMany({ where: { AND: [only, { email }] }, data: { lastSeenAt: new Date(at) } });
  }
  const run = input.data.run ? await deleteInactiveAccounts(db, { only }) : null;
  const left = await db.user.findMany({ where: only, select: { email: true, lastSeenAt: true, ageConfirmedAt: true } });
  return NextResponse.json({ deleted: run?.deleted ?? 0, left });
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { lastOrderNotice } from "~/lib/last-order";
import { isTestAuthAuthorised } from "~/server/utils/test-auth";

/**
 * Test-only (same gate as ../login): the last-order countdown's rule at
 * pretend dates, so e2e can check "from 10 December" without waiting for
 * December or moving dev's clock. Pure: reads and writes nothing.
 *
 * POST { cases: [{ now, lastOrderAt, giftingOpen }] } -> { notices: [...] }
 */
const body = z.object({
  cases: z
    .array(
      z.object({
        now: z.string().datetime(),
        lastOrderAt: z.string().datetime().nullable(),
        giftingOpen: z.boolean(),
      }),
    )
    .max(50),
});

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return new NextResponse("Not Found", { status: 404 });
  const input = body.safeParse(await req.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: input.error.message }, { status: 400 });
  const notices = input.data.cases.map((c) =>
    lastOrderNotice({
      now: new Date(c.now),
      lastOrderAt: c.lastOrderAt ? new Date(c.lastOrderAt) : null,
      giftingOpen: c.giftingOpen,
    }),
  );
  return NextResponse.json({ notices });
}

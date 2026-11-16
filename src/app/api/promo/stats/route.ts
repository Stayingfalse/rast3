import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { getPromoStats } from "~/server/promo-stats";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger("promo-stats");

/**
 * GET /api/promo/stats: rounded site-wide figures and the season's dates for
 * the promo channel's videos (src/server/promo-stats.ts). Server to server
 * only: `Authorization: Bearer $PROMO_API_TOKEN`. Without PROMO_API_TOKEN set
 * (32+ characters) the route doesn't exist (404).
 */
export const dynamic = "force-dynamic";

function authorised(req: NextRequest): boolean | null {
  const secret = process.env.PROMO_API_TOKEN ?? "";
  if (secret.length < 32) return null;
  const header = req.headers.get("authorization") ?? "";
  const provided = Buffer.from(
    header.startsWith("Bearer ") ? header.slice(7) : "",
  );
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(req: NextRequest) {
  const ok = authorised(req);
  if (ok === null) return new NextResponse("Not Found", { status: 404 });
  if (!ok) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  try {
    const stats = await getPromoStats(db);
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error({ error }, "Promo stats failed");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

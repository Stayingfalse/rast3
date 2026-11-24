import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";

/**
 * Is this a workplace's email domain? (owner, 24 Nov) Many sign-in links
 * to work addresses never arrive (company mail blocks them), so the sign-in
 * window asks before sending one. Takes the domain only, never the address,
 * and answers yes or no: workplaces' domains are public already (each has
 * its own raosanta.uk/<domain> page). A subdomain counts (mail.acme.com).
 */
export const dynamic = "force-dynamic";

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export async function GET(req: NextRequest) {
  const domain = (req.nextUrl.searchParams.get("domain") ?? "").trim().toLowerCase();
  if (!DOMAIN.test(domain) || domain.length > 253) return NextResponse.json({ workplace: false });
  // the domain and each parent with at least two labels: a.b.acme.com → b.acme.com, acme.com
  const labels = domain.split(".");
  const candidates = labels.slice(0, -1).map((_, i) => labels.slice(i).join(".")).filter((d) => d.includes("."));
  const found = await db.group.findFirst({
    where: { kind: "ORG", emailDomain: { in: candidates }, status: { in: ["ACTIVE", "PENDING"] } },
    select: { id: true },
  });
  return NextResponse.json({ workplace: !!found }, { headers: { "Cache-Control": "no-store" } });
}

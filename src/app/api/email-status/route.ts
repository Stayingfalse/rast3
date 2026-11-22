import { NextResponse } from "next/server";

import { emailStatus } from "~/server/email/status";

/**
 * Is email getting out? (22 Nov) The sign-in window asks before offering
 * email sign-in. Public and says nothing more than up or down.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(emailStatus(), { headers: { "Cache-Control": "no-store" } });
}

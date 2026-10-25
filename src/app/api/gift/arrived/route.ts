import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { markArrived, validArrival } from "~/server/gifts";

/**
 * Day 26: "something's arrived" from the gift check-in email's signed link,
 * no sign-in needed. The /arrived page's button posts here and comes back.
 */
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const p = q.get("p") ?? "";
  const t = q.get("t") ?? "";
  if (!p || !validArrival(p, t)) {
    return new NextResponse("Invalid link", { status: 400 });
  }
  await markArrived(db, p);

  // behind the proxy, the public host comes in forwarded headers
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const back = new URL("/arrived", host ? `${proto}://${host}` : req.nextUrl.origin);
  back.searchParams.set("p", p);
  back.searchParams.set("t", t);
  return NextResponse.redirect(back, 303);
}

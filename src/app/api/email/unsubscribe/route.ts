import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import { validUnsubscribe } from "~/server/email/unsubscribe";

/**
 * Turns someone's reminder emails off (or back on, with on=1) from a signed
 * link, no sign-in needed. Mail apps' one-click unsubscribe (RFC 8058) posts
 * here directly; the /unsubscribe page's buttons post here and come back.
 */
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const u = q.get("u") ?? "";
  const t = q.get("t") ?? "";
  if (!u || !validUnsubscribe(u, t)) {
    return new NextResponse("Invalid link", { status: 400 });
  }
  const on = q.get("on") === "1";
  await db.user.updateMany({ where: { id: u }, data: { emailReminders: on } });

  // a form on our page: back to it; a mail app: just OK
  if (req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    if (form.get("from") === "page") {
      // behind the proxy, the public host comes in forwarded headers
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      const back = new URL("/unsubscribe", host ? `${proto}://${host}` : req.nextUrl.origin);
      back.searchParams.set("u", u);
      back.searchParams.set("t", t);
      back.searchParams.set("done", on ? "on" : "off");
      return NextResponse.redirect(back, 303);
    }
  }
  return new NextResponse("OK", { status: 200 });
}

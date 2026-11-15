import { NextResponse } from "next/server";

import { env } from "~/env";
import { seasonCalendar } from "~/lib/season-calendar";
import { db } from "~/server/db";
import { seasonWindow } from "~/server/season";

/** This season's dates as a calendar file to add to any diary (public). */
export async function GET(req: Request) {
  const w = await seasonWindow(db);
  const origin = env.AUTH_URL ? new URL(env.AUTH_URL).origin : new URL(req.url).origin;
  return new NextResponse(seasonCalendar(w, origin), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="random-acts-of-santa-${w.year}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

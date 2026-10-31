import { NextResponse } from "next/server";

import { exportAccount } from "~/server/account";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/** Day 30: download everything the site holds about you, as JSON. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to download your data" }, { status: 401 });
  }
  const data = await exportAccount(db, session.user.id);
  if (!data) return NextResponse.json({ error: "No such account" }, { status: 404 });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="raosanta-my-data-${day}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { getAuth } from "~/server/auth-dynamic";
import { db } from "~/server/db";
import { getMemberships } from "~/server/scope";

/** Members of an approved (ACTIVE) organisation can post thank-yous. */
export async function GET() {
  try {
    const auth = await getAuth();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ allowed: false });
    }

    const { org } = await getMemberships(db, session.user.id);
    return NextResponse.json({ allowed: org?.status === "ACTIVE" });
  } catch {
    return NextResponse.json({ allowed: false });
  }
}

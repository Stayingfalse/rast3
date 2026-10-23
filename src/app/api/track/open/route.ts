import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { recordGiftPageOpen, recordParcelOpen } from "~/server/opens";

/**
 * Counts a wishlist being opened on Amazon (owner, 23 Oct 2026). Sent by
 * navigator.sendBeacon as the link opens, so it never delays or changes
 * the link itself. No cookies are set; parcel opens need the holder's own
 * session, gift-page opens only a real gift page's token.
 */
const body = z.union([
  z.object({ assignmentId: z.string().min(1).max(64) }),
  z.object({ giftPage: z.string().min(1).max(64) }),
]);

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  if ("giftPage" in parsed.data) {
    await recordGiftPageOpen(db, parsed.data.giftPage);
    return new NextResponse(null, { status: 204 });
  }
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });
  await recordParcelOpen(db, session.user.id, parsed.data.assignmentId);
  return new NextResponse(null, { status: 204 });
}

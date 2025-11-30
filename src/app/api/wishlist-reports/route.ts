import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// GET - return grouped unresolved reports for the current user's wishlists
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const url = new URL(req.url);
  const wishlistId = url.searchParams.get("wishlistId");

  const where: any = {
    resolved: false,
    wishlist: { ownerId: userId },
  };

  if (wishlistId) {
    // narrow down to a specific wishlist
    where.wishlistId = wishlistId;
  }

  const reports = await db.report.findMany({
    where,
    select: {
      id: true,
      type: true,
      message: true,
      wishlistId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<string, any[]> = {};
  for (const r of reports) {
    grouped[r.type] = grouped[r.type] ?? [];
    grouped[r.type].push(r);
  }

  const out = Object.entries(grouped).map(([type, items]) => ({
    type,
    count: items.length,
    ids: items.map((i) => i.id),
    items,
  }));

  return NextResponse.json(out);
}

  // POST - resolve provided report ids (mark resolved)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const reportIds: string[] = Array.isArray(payload?.reportIds) ? payload.reportIds : [];

  if (reportIds.length === 0) {
    return NextResponse.json({ error: "reportIds required" }, { status: 400 });
  }

  // ensure the current user owns the wishlists for these reports before resolving
  const result = await db.report.updateMany({
    where: {
      id: { in: reportIds },
      wishlist: { ownerId: session.user.id },
    },
    data: { resolved: true },
  });

  return NextResponse.json({ count: result.count });
}

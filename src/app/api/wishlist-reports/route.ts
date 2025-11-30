import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// GET - return grouped unresolved reports for the current user's wishlists
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const wishlistId = url.searchParams.get("wishlistId");

  const where: {
    resolved: boolean;
    wishlistAssignment: {
      wishlistOwnerId: string;
    };
    wishlistAssignmentId?: string;
  } = {
    resolved: false,
    wishlistAssignment: {
      wishlistOwnerId: session.user.id,
    },
  };

  if (wishlistId) {
    // narrow down to a specific wishlist
    where.wishlistAssignmentId = wishlistId;
  }

  const reports = await db.wishlistReport.findMany({
    where,
    select: {
      id: true,
      reportType: true,
      description: true,
      wishlistAssignmentId: true,
      reportedAt: true,
    },
    orderBy: { reportedAt: "desc" },
  });

  type ReportItem = typeof reports[number];
  const grouped: Record<string, ReportItem[]> = {};
  for (const r of reports) {
    grouped[r.reportType] = grouped[r.reportType] ?? [];
    grouped[r.reportType]?.push(r);
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

  const payload = (await req.json()) as { reportIds?: string[] };
  const reportIds: string[] = Array.isArray(payload.reportIds) ? payload.reportIds : [];

  if (reportIds.length === 0) {
    return NextResponse.json({ error: "reportIds required" }, { status: 400 });
  }

  // ensure the current user owns the wishlists for these reports before resolving
  const result = await db.wishlistReport.updateMany({
    where: {
      id: { in: reportIds },
      wishlistAssignment: {
        wishlistOwnerId: session.user.id,
      },
    },
    data: { resolved: true },
  });

  return NextResponse.json({ count: result.count });
}

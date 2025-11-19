import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { checkAdminPermissions } from "~/server/utils/admin-permissions";
import { db } from "~/server/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const adminCheck = await checkAdminPermissions(session.user.id);
  if (!adminCheck.canModerate || adminCheck.adminLevel !== "SITE") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { identifier } = body as { identifier?: string };
  if (!identifier) return NextResponse.json({ error: "Missing identifier" }, { status: 400 });

  // Allow identifier to be user id or email
  const target = await db.user.findFirst({
    where: {
      OR: [{ id: identifier }, { email: identifier }],
    },
    select: { id: true, name: true, firstName: true, lastName: true, email: true },
  });

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const res = NextResponse.json({ success: true });

  // Set a secure, HttpOnly cookie with the target user id for server-side impersonation
  res.cookies.set("impersonate_user", target.id, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
  });

  // Set a human-readable preview cookie (not HttpOnly) so server components can show a banner
  const previewName = target.name ?? `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() ?? target.email ?? target.id;
  res.cookies.set("impersonate_preview", previewName, {
    httpOnly: false,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("impersonate_user", { path: "/" });
  res.cookies.delete("impersonate_preview", { path: "/" });
  return res;
}

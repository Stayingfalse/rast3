import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "~/server/db";
import { getServerSession } from "~/server/auth";

const SESSION_COOKIE_NAME = "next-auth.session-token";
const IMPO_COOKIE = "__impersonation_admin_session";
const IMPO_FLAG = "__is_impersonating";

function makeCookieString(name: string, value: string, maxAge = 3600) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=${value}`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body?.action;

  // Only site admins may impersonate
  if (action === "start") {
    if (session.user.adminLevel !== "SITE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUserId: string | undefined = body?.targetUserId;
    if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });

    // Capture original session token from cookies
    const originalToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

    // Create a new session token for the target user (short lived)
    const impersonationToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.session.create({
      data: {
        sessionToken: impersonationToken,
        userId: targetUserId,
        expires,
      },
    });

    // Build response and set cookies:
    // - set next-auth.session-token -> impersonation token (httpOnly)
    // - set __impersonation_admin_session -> original token (httpOnly) so we can restore
    // - set __is_impersonating -> 1 (not HttpOnly) so client UI can detect

    const res = NextResponse.json({ ok: true, userId: targetUserId });
    res.headers.append("Set-Cookie", makeCookieString(SESSION_COOKIE_NAME, impersonationToken, 60 * 60));
    if (originalToken) {
      res.headers.append("Set-Cookie", makeCookieString(IMPO_COOKIE, originalToken, 60 * 60));
    }
    // non-HttpOnly flag for client detection
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append("Set-Cookie", `${IMPO_FLAG}=1; Path=/; Max-Age=3600; SameSite=Lax${secure}`);

    return res;
  }

  if (action === "stop") {
    // Only allow stop when impersonating
    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    const originalToken = req.cookies.get(IMPO_COOKIE)?.value ?? null;

    // remove impersonation session if present
    if (currentToken) {
      try {
        await db.session.deleteMany({ where: { sessionToken: currentToken } });
      } catch (e) {
        // ignore
      }
    }

    const res = NextResponse.json({ ok: true });

    if (originalToken) {
      // restore original token cookie
      res.headers.append("Set-Cookie", makeCookieString(SESSION_COOKIE_NAME, originalToken, 60 * 60 * 24 * 30));
      // clear stored original token cookie
      res.headers.append("Set-Cookie", `${IMPO_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    } else {
      // clear session cookie if nothing to restore
      res.headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    }

    // clear the impersonation flag
    res.headers.append("Set-Cookie", `${IMPO_FLAG}=; Path=/; Max-Age=0; SameSite=Lax`);

    return res;
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

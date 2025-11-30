import { randomBytes } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const SESSION_COOKIE_NAME = "next-auth.session-token";
const IMPO_COOKIE = "__impersonation_admin_session";
const IMPO_FLAG = "__is_impersonating";

function makeCookieString(name: string, value: string, maxAge = 3600) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=${value}`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function makePublicCookieString(name: string, value: string, maxAge = 3600) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${name}=${value}`, `Path=/`, `SameSite=Lax`, `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { action?: string; targetUserId?: string };
  const action = body.action;

  // Only site admins may impersonate
  if (action === "start") {
    if (session.user.adminLevel !== "SITE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUserId = body.targetUserId;
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

    // Create an audit record for this impersonation
    try {
      await db.impersonationAudit.create({
        data: {
          adminId: session.user.id,
          targetUserId: targetUserId,
          startSessionToken: impersonationToken,
          adminSessionToken: originalToken,
          metadata: {
            ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
          },
        },
      });
    } catch (e) {
      // best-effort; do not fail impersonation if audit fails
      console.error("Failed to write impersonation audit", e);
    }

    // fetch target user display info to return and set a friendly cookie
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true, name: true, email: true },
    });

    const displayName = targetUser
      ? ([targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || targetUser.name) ?? targetUser.email ?? targetUser.id
      : targetUserId;

    const res = NextResponse.json({ ok: true, userId: targetUserId, displayName });
    res.headers.append("Set-Cookie", makeCookieString(SESSION_COOKIE_NAME, impersonationToken, 60 * 60));
    if (originalToken) {
      res.headers.append("Set-Cookie", makeCookieString(IMPO_COOKIE, originalToken, 60 * 60));
    }
    // store a non-HttpOnly cookie with the display name so UI can show who is impersonated
    res.headers.append("Set-Cookie", makePublicCookieString("__impersonated_user", encodeURIComponent(displayName), 60 * 60));
    // non-HttpOnly flag for client detection
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append("Set-Cookie", `${IMPO_FLAG}=1; Path=/; Max-Age=3600; SameSite=Lax${secure}`);

    return res;
  }

  if (action === "stop") {
    // Only allow stop when impersonating
    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    const originalToken = req.cookies.get(IMPO_COOKIE)?.value ?? null;

    // record stop in audit and remove impersonation session if present
    if (currentToken) {
      try {
        await db.impersonationAudit.updateMany({
          where: { startSessionToken: currentToken, stoppedAt: null },
          data: { stoppedAt: new Date(), stopSessionToken: currentToken },
        });
      } catch (err) {
        console.error("Failed to update impersonation audit on stop", err);
      }

      try {
        await db.session.deleteMany({ where: { sessionToken: currentToken } });
      } catch {
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
    // clear impersonated user display cookie
    res.headers.append("Set-Cookie", `__impersonated_user=; Path=/; Max-Age=0; SameSite=Lax`);

    return res;
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

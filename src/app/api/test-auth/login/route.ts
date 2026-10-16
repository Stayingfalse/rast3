import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";

/**
 * Test-only sign-in for end-to-end tests on non-production environments.
 *
 * Disabled (404) unless ENABLE_TEST_LOGIN === "true" and TEST_LOGIN_SECRET is
 * set (32+ chars). Callers must send the secret in the x-test-login-secret
 * header. It can only create and sign in users whose email ends with
 * TEST_EMAIL_DOMAIN, so it cannot be used to impersonate real accounts.
 *
 * POST   -> upsert the test user, create a database session, set the cookie
 * DELETE -> remove all test users (and, via cascades, their sessions/data)
 */

const TEST_EMAIL_DOMAIN = "@e2e.raosanta.test";
const SESSION_COOKIE = "next-auth.session-token";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => email.toLowerCase().endsWith(TEST_EMAIL_DOMAIN), {
      message: `Test users must use an ${TEST_EMAIL_DOMAIN} email`,
    }),
  name: z.string().min(1).max(100).optional(),
  adminLevel: z.enum(["SITE", "DOMAIN", "DEPARTMENT", "USER"]).optional(),
});

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

function isAuthorised(req: NextRequest): boolean {
  if (process.env.ENABLE_TEST_LOGIN !== "true") return false;
  const secret = process.env.TEST_LOGIN_SECRET ?? "";
  if (secret.length < 32) return false;

  const provided = Buffer.from(req.headers.get("x-test-login-secret") ?? "");
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) return notFound();

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name ?? email.split("@")[0];
  const adminLevel = parsed.data.adminLevel ?? "USER";

  const user = await db.user.upsert({
    where: { email },
    update: { name, adminLevel },
    create: { email, name, adminLevel, emailVerified: new Date() },
  });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  const response = NextResponse.json({
    userId: user.id,
    email,
    adminLevel,
    expires: expires.toISOString(),
  });
  // Must match the sessionToken cookie options in src/server/auth*.ts
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires,
  });
  return response;
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorised(req)) return notFound();

  const { count } = await db.user.deleteMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
  });
  return NextResponse.json({ deletedUsers: count });
}

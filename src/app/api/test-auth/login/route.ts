import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";
import { syncUserGroups } from "~/server/groups";
import {
  isTestAuthAuthorised,
  TEST_EMAIL_DOMAIN,
} from "~/server/utils/test-auth";

/**
 * Test-only sign-in for end-to-end tests on non-production environments.
 *
 * Disabled (404) unless ENABLE_TEST_LOGIN === "true" and TEST_LOGIN_SECRET is
 * set (32+ chars). Callers must send the secret in the x-test-login-secret
 * header. It can only create and sign in users whose email ends with
 * @e2e.raosanta.test, so it cannot be used to impersonate real accounts.
 *
 * POST   -> upsert the test user, create a database session, set the cookie
 * DELETE -> remove all test users (and, via cascades, their sessions/data)
 */

const SESSION_COOKIE = "next-auth.session-token";
// Same lifetime as real sessions (Auth.js maxAge, 30 days)
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => email.toLowerCase().endsWith(`@${TEST_EMAIL_DOMAIN}`), {
      message: `Test users must use an @${TEST_EMAIL_DOMAIN} email`,
    }),
  name: z.string().min(1).max(100).optional(),
  adminLevel: z.enum(["SITE", "DOMAIN", "DEPARTMENT", "USER"]).optional(),
});

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return notFound();

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const adminLevel = parsed.data.adminLevel ?? "USER";

  // Keep an existing user's name (e.g. seeded members) unless one is given.
  const user = await db.user.upsert({
    where: { email },
    update: { adminLevel, ...(parsed.data.name ? { name: parsed.data.name } : {}) },
    create: {
      email,
      name: parsed.data.name ?? email.split("@")[0],
      adminLevel,
      emailVerified: new Date(),
    },
  });

  // Admin roles live in group memberships since Day 9
  await syncUserGroups(db, user.id);

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
  if (!isTestAuthAuthorised(req)) return notFound();

  const { count } = await db.user.deleteMany({
    where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
  });
  return NextResponse.json({ deletedUsers: count });
}

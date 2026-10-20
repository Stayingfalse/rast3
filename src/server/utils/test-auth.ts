import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Shared gate for the test-only routes under src/app/api/test-auth.
 *
 * They are disabled unless ENABLE_TEST_LOGIN === "true" and TEST_LOGIN_SECRET
 * is set (32+ chars), and callers must send the secret in the
 * x-test-login-secret header. Never enable on production.
 */

/** Test data only ever uses this email domain, so it can't touch real users. */
export const TEST_EMAIL_DOMAIN = "e2e.raosanta.test";

/**
 * The email domain one test run works in. A run can send x-test-namespace
 * (e.g. "desktop") to get its own subdomain, desktop.e2e.raosanta.test, so
 * parallel runs never seed or delete each other's users.
 */
export function testDomain(req: NextRequest) {
  const ns = req.headers.get("x-test-namespace")?.trim().toLowerCase() ?? "";
  return /^[a-z0-9-]{1,30}$/.test(ns) ? `${ns}.${TEST_EMAIL_DOMAIN}` : TEST_EMAIL_DOMAIN;
}

export function isTestAuthAuthorised(req: NextRequest): boolean {
  if (process.env.ENABLE_TEST_LOGIN !== "true") return false;
  const secret = process.env.TEST_LOGIN_SECRET ?? "";
  if (secret.length < 32) return false;

  const provided = Buffer.from(req.headers.get("x-test-login-secret") ?? "");
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

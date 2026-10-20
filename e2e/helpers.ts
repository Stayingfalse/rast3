import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  expect,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

export const TEST_LOGIN_SECRET = process.env.E2E_TEST_LOGIN_SECRET ?? "";
export const hasTestLogin = TEST_LOGIN_SECRET.length > 0;

/**
 * Each test run works in its own email subdomain (CI runs desktop and mobile
 * side by side as "desktop" and "mobile"; local runs default to "local"), so
 * one run's seed and clean-up never touch another's users.
 */
const NAMESPACE = process.env.E2E_NS ?? "local";
export const E2E_DOMAIN = `${NAMESPACE}.e2e.raosanta.test`;
const testHeaders = {
  "x-test-login-secret": TEST_LOGIN_SECRET,
  "x-test-namespace": NAMESPACE,
};

type AdminLevel = "SITE" | "USER";

/** Signs the page's browser context in as a test user via the dev-only route. */
export async function loginAs(
  page: Page,
  user: { email: string; name?: string; adminLevel?: AdminLevel },
) {
  const res = await page.request.post("/api/test-auth/login", {
    headers: testHeaders,
    data: user,
  });
  expect(res.status(), await res.text()).toBe(200);
  // Signed-in screenshots shouldn't be covered by the cookie notice
  await page.context().addCookies([
    {
      name: "cookie-consent",
      value: "seen",
      domain: new URL(res.url()).hostname,
      path: "/",
    },
  ]);
  return (await res.json()) as { userId: string; email: string };
}

/** Removes this run's test users (emails ending @E2E_DOMAIN). */
export async function deleteTestUsers(request: APIRequestContext) {
  const res = await request.delete("/api/test-auth/login", {
    headers: testHeaders,
  });
  expect(res.status()).toBe(200);
}

/** Saves a full-page screenshot to test-results/screenshots/<project>/<name>.png */
export async function snap(page: Page, testInfo: TestInfo, name: string) {
  const dir = path.join("test-results", "screenshots", testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(name, { path: file, contentType: "image/png" });
}

/** Collects uncaught page errors so tests can assert there were none. */
export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

/** Waits for client-side rendering to settle. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

/** Wipes and recreates the dev seed dataset; returns its summary. */
export async function seed(request: APIRequestContext) {
  const res = await request.post("/api/test-auth/seed", {
    headers: testHeaders,
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as {
    members: number;
    groups: number;
    memberships: number;
    assignments: number;
    purchases: number;
    kudos: number;
    giver: { email: string };
  };
}

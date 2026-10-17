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

type AdminLevel = "SITE" | "DOMAIN" | "DEPARTMENT" | "USER";

/** Signs the page's browser context in as a test user via the dev-only route. */
export async function loginAs(
  page: Page,
  user: { email: string; name?: string; adminLevel?: AdminLevel },
) {
  const res = await page.request.post("/api/test-auth/login", {
    headers: { "x-test-login-secret": TEST_LOGIN_SECRET },
    data: user,
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as { userId: string; email: string };
}

/** Removes every test user (emails ending @e2e.raosanta.test). */
export async function deleteTestUsers(request: APIRequestContext) {
  const res = await request.delete("/api/test-auth/login", {
    headers: { "x-test-login-secret": TEST_LOGIN_SECRET },
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
    headers: { "x-test-login-secret": TEST_LOGIN_SECRET },
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as {
    members: number;
    assignments: number;
    purchases: number;
    kudos: number;
    giver: { email: string };
  };
}

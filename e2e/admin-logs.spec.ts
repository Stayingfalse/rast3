import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, trackPageErrors } from "./helpers";

/**
 * Our own log (owner, 19 Nov): site admins send a test email from Admin ›
 * Settings and see which step failed; every test (and sign-in email,
 * reminder and Auth.js error) is kept in Admin › Logs for 30 days. Dev has
 * no email server, so the test stops at "settings" and nothing is sent.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);

type Logs = { entries: { level: string; area: string; message: string; detail: unknown }[]; keptDays: number };
const who = (name: string, p: string) => `al-${name}-${p}@${E}`;

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a site admin's test email says which step failed, and Admin › Logs keeps it", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  const errors = trackPageErrors(page);

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(page.getByText("Failed at: Reading the email settings")).toBeVisible();

  const logs = (await unwrap(await query(page.request, "admin.logs", { level: "ERROR", area: "email-test" }))) as Logs;
  expect(logs.keptDays).toBe(30);
  const latest = logs.entries[0]!;
  expect(latest).toMatchObject({ level: "ERROR", area: "email-test", message: 'Test email failed at "settings"' });
  // the address it went to is masked
  expect(JSON.stringify(latest.detail)).toContain("a•••@");
  expect(JSON.stringify(latest.detail)).not.toContain(who("site", p));

  await page.goto("/admin/logs");
  await page.getByLabel("About").selectOption("email-test");
  const entry = page.getByRole("listitem").filter({ hasText: 'Test email failed at "settings"' }).first();
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  await expect(entry.getByText(/No email server is set up/)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-logs");
  expect(errors).toEqual([]);
});

test("only site admins see the logs or send test emails", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("member", testInfo.project.name) });
  expect((await query(page.request, "admin.logs", {})).status()).toBe(403);
  expect((await mutate(page.request, "admin.sendTestEmail")).status()).toBe(403);
});

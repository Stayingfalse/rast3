import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, trackPageErrors } from "./helpers";

/**
 * "Send test email" (owner, 19 Nov): site admins send one email the way
 * sign-in links go and see which step failed and what the server said. Dev
 * has no email server, so the test stops at "settings" and nothing is sent.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const who = (name: string, p: string) => `et-${name}-${p}@${E}`;

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a site admin's test email says which step failed", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  const errors = trackPageErrors(page);

  const r = (await unwrap(await mutate(page.request, "admin.sendTestEmail"))) as {
    ok: boolean;
    step: string | null;
    to: string;
  };
  expect(r).toMatchObject({ ok: false, step: "settings" });
  // the address is masked in what comes back
  expect(r.to).toMatch(/^e•••@/);

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(page.getByText("Failed at: Reading the email settings")).toBeVisible();
  await expect(page.getByText(/No email server is set up/)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "email-test");
  expect(errors).toEqual([]);
});

test("the connection check says where the connection stops", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  const errors = trackPageErrors(page);

  // dev has no email server saved, so this probes Gmail's (20 Nov)
  const r = (await unwrap(await mutate(page.request, "admin.checkEmailConnection"))) as {
    ok: boolean;
    saved: boolean;
    probe: { host: string; port: number; attempts: { port: number; family: number; outcome: string }[] };
  };
  expect(r.saved).toBe(false);
  expect(r.probe).toMatchObject({ host: "smtp.gmail.com", port: 587 });
  expect(r.probe.attempts.length).toBeGreaterThan(0);
  // what the host sees, for the 20 Nov outage (whatever it is, the test passes)
  testInfo.annotations.push({ type: "probe", description: JSON.stringify(r.probe.attempts) });
  console.log(`[${p}] smtp probe:`, JSON.stringify(r.probe.attempts));

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Check the connection only" }).click();
  await expect(page.getByText(/smtp\.gmail\.com (answers|doesn't answer) on port 587\./)).toBeVisible({ timeout: 30_000 });
  await settle(page);
  await snap(page, testInfo, "email-connection-check");
  expect(errors).toEqual([]);
});

test("only site admins can send one", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("member", testInfo.project.name) });
  expect((await mutate(page.request, "admin.sendTestEmail")).status()).toBe(403);
  expect((await mutate(page.request, "admin.checkEmailConnection")).status()).toBe(403);
});

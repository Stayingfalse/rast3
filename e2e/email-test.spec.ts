import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, testHeaders, trackPageErrors } from "./helpers";

/**
 * "Send test email" (owner, 19 Nov): site admins send one email the way
 * sign-in links go and see which step failed and what the server said. Dev
 * sends to its test mailbox (Mailpit, 26 Nov), so the email really goes and
 * the test reads it there.
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

test("a site admin's test email arrives", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  const me = who("site", p);
  await loginAs(page, { email: me, adminLevel: "SITE" });
  const errors = trackPageErrors(page);
  await page.request.delete(`/api/test-auth/mailbox?to=${encodeURIComponent(me)}`, { headers: testHeaders });

  const r = (await unwrap(await mutate(page.request, "admin.sendTestEmail"))) as {
    ok: boolean;
    step: string | null;
    to: string;
  };
  expect(r).toMatchObject({ ok: true, step: null });
  // the address is masked in what comes back
  expect(r.to).toMatch(/^e•••@/);
  // and it's in the test mailbox
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`/api/test-auth/mailbox?to=${encodeURIComponent(me)}`, { headers: testHeaders });
        return ((await res.json()) as { messages: { subject: string }[] }).messages.map((m) => m.subject);
      },
      { timeout: 30_000 },
    )
    .toContain("Random Acts of Santa: test email");

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(page.getByText(/^Sent to e•••@/)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "email-test");
  expect(errors).toEqual([]);
});

test("the connection check reaches the mail server", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  const errors = trackPageErrors(page);

  // dev's saved server is its test mailbox; the probe greets it (20 Nov)
  const r = (await unwrap(await mutate(page.request, "admin.checkEmailConnection"))) as {
    ok: boolean;
    saved: boolean;
    probe: { host: string; port: number; attempts: { port: number; family: number; outcome: string }[] };
  };
  expect(r).toMatchObject({ ok: true, saved: true });
  expect(r.probe.attempts.some((a) => a.port === r.probe.port && a.outcome === "greeting")).toBe(true);

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Check the connection only" }).click();
  await expect(page.getByText(new RegExp(`${r.probe.host.replace(/\./g, "\\.")} answers on port ${r.probe.port}\\.`))).toBeVisible({
    timeout: 30_000,
  });
  await settle(page);
  await snap(page, testInfo, "email-connection-check");
  expect(errors).toEqual([]);
});

test("only site admins can send one", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("member", testInfo.project.name) });
  expect((await mutate(page.request, "admin.sendTestEmail")).status()).toBe(403);
  expect((await mutate(page.request, "admin.checkEmailConnection")).status()).toBe(403);
});

import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  testHeaders,
  trackPageErrors,
} from "./helpers";

/**
 * Day 30: privacy commitments. New members confirm they're 16 or over;
 * members download everything held about them and delete their own account;
 * accounts unused for 24 months are deleted.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const who = (name: string, p: string) => `acc-${name}-${p}@${E}`;
const list = (name: string, p: string) =>
  `https://www.amazon.co.uk/hz/wishlist/ls/${`E2EACC${name.toUpperCase()}${p.length}`.slice(0, 13).padEnd(13, "0")}`;
type Left = { email: string; lastSeenAt: string | null; ageConfirmedAt: string | null };
const retention = async (r: APIRequestContext, data: { lastSeen?: Record<string, string>; run?: boolean }) => {
  const res = await r.post("/api/test-auth/retention", { headers: testHeaders, data });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as { deleted: number; left: Left[] };
};
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString();
};

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a first profile needs the 16+ confirmation, and it's recorded", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("ana", p) });
  const profile = { firstName: "Ana", lastName: "Account", amazonWishlistUrl: list("ana", p) };
  const refused = await mutate(page.request, "profile.saveProfile", profile);
  expect(refused.status()).toBe(400);
  expect(await refused.text()).toContain("16 or over");
  expect((await mutate(page.request, "profile.saveProfile", { ...profile, over16: true })).status()).toBe(200);

  // when they confirmed, and that they've been here (for the 24-month rule)
  await expect
    .poll(async () => (await retention(page.request, { run: false })).left.find((u) => u.email === who("ana", p)))
    .toMatchObject({ ageConfirmedAt: expect.any(String), lastSeenAt: expect.any(String) });
});

test("members download everything held about them", async ({ page, request }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("ana", p) });
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toMatch(/^attachment; filename="raosanta-my-data-\d{4}-\d{2}-\d{2}\.json"$/);
  const text = await res.text();
  const data = JSON.parse(text) as { profile: { firstName: string; email: string; ageConfirmedAt: string | null } };
  expect(data.profile).toMatchObject({ firstName: "Ana", email: who("ana", p) });
  expect(data.profile.ageConfirmedAt).not.toBeNull();
  // no secrets: sign-in tokens and session keys stay on the server
  expect(text).not.toMatch(/sessionToken|access_token|refresh_token|id_token/);

  // signed out, there's nothing to download
  expect((await request.get("/api/account/export")).status()).toBe(401);
});

test("a member deletes their own account from Your data", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await loginAs(page, { email: who("ana", p) });
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Your data", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download my data (JSON)" })).toHaveAttribute("href", "/api/account/export");
  const button = page.getByRole("button", { name: "Delete my account" });
  await expect(button).toBeDisabled();
  await page.getByLabel("Type delete to confirm").fill("nope");
  await expect(button).toBeDisabled();
  await page.getByLabel("Type delete to confirm").fill("delete");
  await expect(button).toBeEnabled();
  await settle(page);
  await snap(page, testInfo, "account-delete");

  await button.click();
  await expect(page).toHaveURL(/\/\?deleted=1$/);
  await expect(page.getByRole("status")).toContainText("Your account and everything in it has been deleted");
  await settle(page);
  await snap(page, testInfo, "account-deleted");
  // the account is gone
  expect((await page.request.get("/api/account/export")).status()).toBe(401);
  expect((await retention(page.request, { run: false })).left.map((u) => u.email)).not.toContain(who("ana", p));
  expect(errors).toEqual([]);
});

test("site admins can't delete themselves; a wrong confirmation does nothing", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  expect((await mutate(page.request, "profile.deleteAccount", { confirm: "delete" })).status()).toBe(403);
  await loginAs(page, { email: who("bo", p) });
  expect((await mutate(page.request, "profile.deleteAccount", { confirm: "yes" })).status()).toBe(400);
  expect((await page.request.get("/api/account/export")).status()).toBe(200);
});

test("accounts unused for 24 months are deleted, and only those", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  for (const name of ["old", "recent"]) {
    await loginAs(page, { email: who(name, p) });
    await mutate(page.request, "profile.saveProfile", {
      over16: true,
      firstName: name,
      lastName: "Member",
      amazonWishlistUrl: list(name, p),
    });
  }
  await page.goto("about:blank");
  const run = await retention(page.request, {
    lastSeen: { [who("old", p)]: monthsAgo(25), [who("recent", p)]: monthsAgo(23) },
  });
  expect(run.deleted).toBe(1);
  const left = run.left.map((u) => u.email);
  expect(left).not.toContain(who("old", p));
  expect(left).toContain(who("recent", p));
});

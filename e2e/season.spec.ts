import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  seed,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/**
 * Day 18: the Christmas season. Returning members check in (wishlist and
 * groups) before picking up or being picked up; pick-ups wait for the
 * season's dates unless a site admin opens a group early; last season's
 * pick-ups are archived. Runs before 15 Nov, when the season hasn't opened.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const errorMessage = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { error: { json: { message: string } } }).error.json.message;

type Status = { season: number; checkedIn: boolean; phase: string; openNow: boolean };
let returning = "";

test.beforeAll(async ({ request }) => {
  const summary = (await seed(request)) as unknown as { returning: { email: string } };
  returning = summary.returning.email;
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a returning member checks in before gifting", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: returning });
  const r = page.request;
  const before = (await unwrap(await query(r, "season.status"))) as Status;
  expect(before.checkedIn).toBe(false);

  // no pick-ups until checked in
  const early = await mutate(r, "wishlist.requestInitialAssignments");
  expect(early.status()).toBe(412);
  expect(await errorMessage(early)).toMatch(/Check in for Christmas/);

  await page.goto("/");
  const card = page.getByRole("region", { name: `Ready for Christmas ${before.season}?` });
  await expect(card).toBeVisible();
  await expect(card.getByRole("radio", { name: /Keep my wishlist/ })).toBeChecked();
  await expect(page.getByRole("button", { name: /Get My 3 Wishlist/ })).toHaveCount(0);
  await settle(page);
  await snap(page, testInfo, "season-check-in");

  // a different list has to be an Amazon UK wishlist
  await card.getByRole("radio", { name: "Use a different wishlist" }).click();
  await card.getByLabel("Amazon UK wishlist link").fill("https://example.com/my-list");
  await card.getByRole("button", { name: `Check in for ${before.season}` }).click();
  await expect(card.getByText("That isn't an Amazon UK wishlist link.", { exact: false })).toBeVisible();

  await card.getByLabel("Amazon UK wishlist link").fill(
    "https://www.amazon.co.uk/hz/wishlist/ls/E2ERET0002",
  );
  await card.getByRole("button", { name: `Check in for ${before.season}` }).click();
  await expect(card).toHaveCount(0);
  const after = (await unwrap(await query(r, "season.status"))) as Status;
  expect(after.checkedIn).toBe(true);
  const me = (await unwrap(await query(r, "profile.getCurrentProfile"))) as {
    amazonWishlistUrl: string;
  };
  expect(me.amazonWishlistUrl).toBe("https://www.amazon.co.uk/hz/wishlist/ls/E2ERET0002");
  // their workplace was opened early by the seed, so gifting is open for them
  expect((await mutate(r, "wishlist.requestInitialAssignments")).status()).toBe(200);
  expect(errors).toEqual([]);
});

test("last season's pick-ups are archived, not shown or held", async ({ page }) => {
  await loginAs(page, { email: `giver@${E}` });
  const parcels = (await unwrap(await query(page.request, "wishlist.getMyAssignments"))) as {
    assignedAt: string;
  }[];
  for (const p of parcels) {
    expect(new Date(p.assignedAt).getTime()).toBeGreaterThanOrEqual(Date.UTC(2026, 7, 1));
  }
});

test("pick-ups wait for the season unless a group is opened early", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  const name = `E2E Early Birds ${p}`;
  await loginAs(page, { email: `early-a-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", {
    firstName: "Ena",
    lastName: "Early",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EEAR0001",
  });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  await loginAs(page, { email: `early-b-${p}@${E}` });
  // a new member's first profile is their check-in
  await mutate(page.request, "profile.saveProfile", {
    firstName: "Eli",
    lastName: "Early",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EEAR0002",
  });
  expect(
    ((await unwrap(await query(page.request, "season.status"))) as Status).checkedIn,
  ).toBe(true);
  await mutate(page.request, "groups.join", { code: g.joinCode });

  await loginAs(page, { email: `early-site-${p}@${E}`, adminLevel: "SITE" });
  await mutate(page.request, "groups.setStatus", { groupId: g.id, status: "ACTIVE" });

  await loginAs(page, { email: `early-b-${p}@${E}` });
  const status = (await unwrap(await query(page.request, "season.status"))) as Status;
  test.skip(status.phase === "open", "the season is open, so nothing waits");
  const closed = await mutate(page.request, "wishlist.requestFromGroup", { groupId: g.id, count: 1 });
  expect(closed.status()).toBe(412);
  expect(await errorMessage(closed)).toMatch(/Gifting opens on/);
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Gifting opens on" })).toBeVisible();

  await loginAs(page, { email: `early-site-${p}@${E}`, adminLevel: "SITE" });
  expect(
    (await mutate(page.request, "admin.setOpenEarly", { groupId: g.id, open: true })).status(),
  ).toBe(200);
  await page.goto("/admin/season");
  await expect(page.getByRole("listitem").filter({ hasText: name })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-season");

  await loginAs(page, { email: `early-b-${p}@${E}` });
  expect(
    (await mutate(page.request, "wishlist.requestFromGroup", { groupId: g.id, count: 1 })).status(),
  ).toBe(200);
});

test("only site admins change the season", async ({ page }, testInfo) => {
  await loginAs(page, { email: `early-a-${testInfo.project.name}@${E}` });
  expect((await query(page.request, "admin.season")).status()).toBe(403);
  expect(
    (
      await mutate(page.request, "admin.setSeasonDates", {
        opensAt: "2026-11-01T00:00:00Z",
        closesAt: "2027-01-06T23:59:59Z",
      })
    ).status(),
  ).toBe(403);
});

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
 * Day 26: each friends or community group has its own thank-you feed:
 * thank-yous for gifts given in the group, plus members' thank-yous not tied
 * to a gift. Only the group's members can read it, and the home page's feed
 * follows the group you're gifting in.
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

const who = (name: string, p: string) => `gthx-${name}-${p}@${E}`;
const list = (n: string) => `https://www.amazon.co.uk/hz/wishlist/ls/E2EGTHX00${n}`;
const groups = { supper: { id: "", code: "", name: "" }, books: { id: "", code: "", name: "" } };
const msg = (what: string, p: string) => `E2E ${what} thank-you ${p}`;

const feed = async (r: APIRequestContext, groupId: string) => {
  const res = await query(r, "kudos.getFeed", { scope: "group", groupId, limit: 50 });
  return {
    status: res.status(),
    messages: res.ok() ? ((await unwrap(res)) as { items: { message: string }[] }).items.map((k) => k.message) : [],
  };
};

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: two friends groups, a gift and a thank-you in each", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const p = testInfo.project.name;
  // a first profile with a wishlist is the season's check-in
  const profile = async (first: string, n: string) =>
    expect(
      (
        await mutate(page.request, "profile.saveProfile", {
          firstName: first,
          lastName: "Thanks",
          amazonWishlistUrl: list(n),
        })
      ).status(),
    ).toBe(200);

  // Ann starts the supper club, Bea the book club
  for (const [key, owner, n, name] of [
    ["supper", "ann", "1", `E2E Supper ${p}`],
    ["books", "bea", "2", `E2E Books ${p}`],
  ] as const) {
    await loginAs(page, { email: who(owner, p) });
    await profile(owner, n);
    const g = (await unwrap(
      await mutate(page.request, "groups.create", { name, kind: "FRIENDS" }),
    )) as { id: string; joinCode: string };
    groups[key] = { id: g.id, code: g.joinCode, name };
  }
  // Bea is in both; Dan only in the book club; Eve in neither
  await loginAs(page, { email: who("bea", p) });
  expect((await mutate(page.request, "groups.join", { code: groups.supper.code })).status()).toBe(200);
  await loginAs(page, { email: who("dan", p) });
  await profile("dan", "3");
  expect((await mutate(page.request, "groups.join", { code: groups.books.code })).status()).toBe(200);
  await loginAs(page, { email: who("eve", p) });
  await profile("eve", "4");

  await loginAs(page, { email: `gthx-site-${p}@${E}`, adminLevel: "SITE" });
  for (const g of Object.values(groups)) {
    expect((await mutate(page.request, "groups.setStatus", { groupId: g.id, status: "ACTIVE" })).status()).toBe(200);
    expect((await mutate(page.request, "admin.setOpenEarly", { groupId: g.id, open: true })).status()).toBe(200);
    expect(
      (await mutate(page.request, "admin.setGroupAffiliate", { groupId: g.id, mode: "OFF", tag: null })).status(),
    ).toBe(200);
  }

  // Bea gifts Ann's list in the supper club; Dan gifts Bea's in the book club
  for (const [santa, group] of [
    ["bea", groups.supper],
    ["dan", groups.books],
  ] as const) {
    await loginAs(page, { email: who(santa, p) });
    expect(
      (await mutate(page.request, "wishlist.requestFromGroup", { groupId: group.id, count: 1 })).status(),
    ).toBe(200);
    const [parcel] = (await unwrap(
      await query(page.request, "wishlist.getMyAssignments", { groupId: group.id }),
    )) as { id: string }[];
    expect((await mutate(page.request, "wishlist.markPurchase", { assignmentId: parcel!.id })).status()).toBe(200);
  }
  // gifts only show to the person they're for after a few days
  const aged = await page.request.post("/api/test-auth/reminders", {
    headers: testHeaders,
    data: { ageGifts: 5, run: false },
  });
  expect(aged.status()).toBe(200);

  // Ann and Bea each thank their Santa; Bea also posts a general thank-you
  for (const [owner, what] of [
    ["ann", "supper"],
    ["bea", "books"],
  ] as const) {
    await loginAs(page, { email: who(owner, p) });
    const [gift] = (await unwrap(await query(page.request, "wishlist.giftsToMe"))) as { id: string }[];
    expect(gift).toBeTruthy();
    expect(
      (await mutate(page.request, "kudos.createKudos", { message: msg(what, p), purchaseId: gift!.id, images: [] }))
        .status(),
    ).toBe(200);
  }
  expect(
    (await mutate(page.request, "kudos.createKudos", { message: msg("general", p), images: [] })).status(),
  ).toBe(200);
});

test("a group's feed has its own gifts' thank-yous and its members' general ones", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("ann", p) });
  const supper = await feed(page.request, groups.supper.id);
  expect(supper.status).toBe(200);
  expect(supper.messages).toContain(msg("supper", p));
  expect(supper.messages).toContain(msg("general", p)); // Bea is in the supper club
  expect(supper.messages).not.toContain(msg("books", p)); // a gift from Bea's other group

  await loginAs(page, { email: who("dan", p) });
  const books = await feed(page.request, groups.books.id);
  expect(books.messages).toContain(msg("books", p));
  expect(books.messages).toContain(msg("general", p));
  expect(books.messages).not.toContain(msg("supper", p));
});

test("only members can read a group's feed", async ({ page, request }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("eve", p) });
  expect((await feed(page.request, groups.supper.id)).status).toBe(404);
  await loginAs(page, { email: who("dan", p) });
  expect((await feed(page.request, groups.supper.id)).status).toBe(404);
  // signed out
  expect((await feed(request, groups.supper.id)).status).toBe(404);
});

test("the home page's feed follows the group you're gifting in", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await loginAs(page, { email: who("bea", p) });
  await page.goto("/");
  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: groups.books.name }).click();

  const feedTabs = page.getByRole("tablist", { name: "Kudos from" });
  await expect(feedTabs.getByRole("tab", { name: groups.books.name })).toHaveAttribute("aria-selected", "true");
  // no workplace: no Team or Organisation tabs
  await expect(feedTabs.getByRole("tab", { name: "Team" })).toHaveCount(0);
  const kudos = page.locator("#kudos-section");
  await expect(kudos.getByText(msg("books", p))).toBeVisible();
  await expect(kudos.getByText(msg("supper", p))).toHaveCount(0);

  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: groups.supper.name }).click();
  await expect(feedTabs.getByRole("tab", { name: groups.supper.name })).toHaveAttribute("aria-selected", "true");
  await expect(kudos.getByText(msg("supper", p))).toBeVisible();
  await kudos.getByRole("heading", { name: "Thank-you post" }).scrollIntoViewIfNeeded();
  await settle(page);
  await snap(page, testInfo, "group-thanks");
  expect(errors).toEqual([]);
});

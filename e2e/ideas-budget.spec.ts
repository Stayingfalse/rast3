import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/**
 * Day 20: members' gift ideas and organisers' suggested budgets, shown on a
 * picked-up wishlist and its public gift page, without the owner's name.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

const IDEAS = ["Good coffee beans", "Anything for the garden", "T-shirts: size M"];
let groupId = "";
let groupName = "";
const owner = (p: string) => `ideas-owner-${p}@${E}`;
const santa = (p: string) => `ideas-santa-${p}@${E}`;

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: an owner with gift ideas, and a group with gift pages", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Ideas Club ${p}`;
  const profile = (giftIdeas: string[]) =>
    mutate(page.request, "profile.saveProfile", {
      firstName: "Ida",
      lastName: "Ideas",
      amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EIDEA0001",
      giftIdeas,
    });
  await loginAs(page, { email: owner(p) });
  // ideas are shown without a name: no links or contact details
  expect((await profile(["See www.example.com"])).status()).toBe(400);
  expect((await profile(["Call me on 07700 900123"])).status()).toBe(400);
  expect((await profile(["one", "two", "three", "four", "five", "six"])).status()).toBe(400);
  expect((await profile(IDEAS)).status()).toBe(200);
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;

  await loginAs(page, { email: santa(p) });
  await mutate(page.request, "profile.saveProfile", {
    firstName: "Sam",
    lastName: "Santa",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EIDEA0002",
  });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  // only organisers set the budget
  expect(
    (await mutate(page.request, "groups.setBudget", { groupId, budget: "UP_TO_50" })).status(),
  ).toBe(403);

  await loginAs(page, { email: `ideas-site-${p}@${E}`, adminLevel: "SITE" });
  const r = page.request;
  expect((await mutate(r, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(r, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  // gift pages: affiliate links on for this group, with the default ID
  expect(
    (
      await mutate(r, "admin.setAffiliateSettings", {
        enabled: true,
        defaultTag: "raosanta04-21",
        orgDefault: false,
        communityDefault: true,
        friendsDefault: true,
      })
    ).status(),
  ).toBe(200);
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: null })).status(),
  ).toBe(200);
});

test("the owner's ideas come back in the profile form", async ({ page }, testInfo) => {
  await loginAs(page, { email: owner(testInfo.project.name) });
  const me = (await unwrap(
    await page.request.get(
      `/api/trpc/profile.getCurrentProfile?input=${encodeURIComponent(JSON.stringify({ json: null }))}`,
    ),
  )) as { giftIdeas: string | null };
  expect(me.giftIdeas).toBe(IDEAS.join("\n"));
});

test("an organiser sets a suggested budget", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: owner(testInfo.project.name) });
  await page.goto(`/groups/${groupId}/manage`);
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("combobox", { name: "Budget per gift" }).click();
  await page.getByRole("option", { name: "Up to £20" }).click();
  await expect(page.getByText("Budget saved")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Budget per gift" })).toHaveText(
    "Up to £20",
  );
  await settle(page);
  await snap(page, testInfo, "organiser-budget");
  expect(errors).toEqual([]);
});

test("a Santa sees the budget and ideas, and the gift page shows them without a name", async ({
  page,
  browser,
}, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: santa(testInfo.project.name) });
  await page.goto("/");
  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: groupName }).click();
  const panel = page.getByRole("tabpanel", { name: groupName });
  await expect(panel.getByText("Suggested budget: Up to £20.")).toBeVisible();
  await panel.getByRole("button", { name: "Pick up a wishlist" }).click();
  const parcel = panel.getByRole("listitem").filter({ hasText: "Parcel 1" });
  await expect(parcel.getByText("Up to £20, as a guide")).toBeVisible();
  for (const idea of IDEAS) await expect(parcel.getByText(idea)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "parcel-ideas");

  const href = await parcel.getByRole("link", { name: "Open wishlist" }).getAttribute("href");
  expect(href).toMatch(/^\/gift\//);
  // the gift page is public: open it signed out
  const { baseURL, proxy } = testInfo.project.use;
  const visitor = await browser.newContext({ baseURL, proxy });
  const pub = await visitor.newPage();
  expect((await pub.goto(href!))?.status()).toBe(200);
  await expect(pub.getByText("Up to £20")).toBeVisible();
  for (const idea of IDEAS) await expect(pub.getByText(idea)).toBeVisible();
  await expect(pub.getByText(/Ida|Ideas/)).toHaveCount(0);
  await settle(pub);
  await snap(pub, testInfo, "gift-page-ideas");
  await visitor.close();
  expect(errors).toEqual([]);
});

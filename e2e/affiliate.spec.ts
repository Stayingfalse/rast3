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

/** Amazon affiliate links: gift pages, per-group switch, disclosures (20 Oct). */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
/** each parallel job has its own test tracking ID (one group per ID per season) */
let TAG = "";
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const profile = (r: APIRequestContext, first: string, list: string) =>
  mutate(r, "profile.saveProfile", {
    firstName: first,
    lastName: "Shopper",
    amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/${list}`,
  });
type Parcel = { link: string | null; viaGiftPage: boolean };
const parcels = async (r: APIRequestContext) =>
  (await unwrap(await query(r, "wishlist.getMyAssignments", { groupId }))) as Parcel[];

let groupId = "";
let groupName = "";
let giftPath = "";
const site = (p: string) => `aff-site-${p}@${E}`;

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: affiliate links on, and a friends group with its own tracking ID", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Gift Circle ${p}`;
  TAG = `raosantae2e-${p}-21`;
  await loginAs(page, { email: `aff-a-${p}@${E}` });
  expect((await profile(page.request, "Alma", "E2EAFA0001")).status()).toBe(200);
  const created = (await unwrap(
    await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = created.id;

  await loginAs(page, { email: `aff-b-${p}@${E}` });
  expect((await profile(page.request, "Bo", "E2EAFB0001")).status()).toBe(200);
  expect((await mutate(page.request, "groups.join", { code: created.joinCode })).status()).toBe(200);

  await loginAs(page, { email: site(p), adminLevel: "SITE" });
  const r = page.request;
  expect((await mutate(r, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(r, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  // dev only: the master switch stays on (other specs force their groups off)
  expect(
    (
      await mutate(r, "admin.setAffiliateSettings", {
        enabled: true,
        defaultTag: "raosanta04-21",
        defaultTagUs: "raosanta-20",
        orgDefault: false,
        communityDefault: true,
        friendsDefault: true,
      })
    ).status(),
  ).toBe(200);
  // tracking IDs come from the pool
  expect(
    (
      await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: "raosantanopool-21" })
    ).status(),
  ).toBe(400);
  // the default ID can't also be one group's own
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: "raosanta04-21" })).status(),
  ).toBe(400);
  expect((await mutate(r, "admin.addTrackingIds", { tags: [TAG] })).status()).toBe(200);
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: TAG })).status(),
  ).toBe(200);
  // tracking IDs are checked
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: "not a tag" })).status(),
  ).toBe(400);
});

test("a picked-up wishlist opens from a public gift page", async ({ page, browser }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `aff-b-${testInfo.project.name}@${E}` });
  expect(
    (await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 })).status(),
  ).toBe(200);
  const [parcel] = await parcels(page.request);
  expect(parcel?.viaGiftPage).toBe(true);
  expect(parcel?.link).toMatch(/^\/gift\/[\w-]{20,}$/);
  giftPath = parcel!.link!;

  // the group page explains why
  await page.goto("/");
  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: groupName }).click();
  const panel = page.getByRole("tabpanel", { name: groupName });
  await expect(panel.getByText("Wishlists in this group open from a gift page")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Open wishlist" })).toHaveAttribute("href", giftPath);
  await expect(page.locator("footer").filter({ hasText: "As an Amazon Associate" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "affiliate-group-home");

  // the gift page works signed out and shows no names
  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  const res = await pub.goto(giftPath);
  expect(res?.status()).toBe(200);
  await expect(pub.getByRole("heading", { name: "A wishlist to gift" })).toBeVisible();
  const amazon = pub.getByRole("link", { name: "Open the wishlist on Amazon" });
  // dev isn't the registered site, so it gets the dummy ID (the group's own
  // ID is only used on raosanta.uk)
  await expect(amazon).toHaveAttribute("href", /ls\/E2EAFA0001\?tag=raosantatest-21$/);
  await expect(amazon).toHaveAttribute("rel", /sponsored/);
  await expect(amazon).toHaveAttribute("referrerpolicy", "no-referrer-when-downgrade");
  await expect(pub.getByText("Ad · Affiliate link", { exact: true })).toBeVisible();
  await expect(pub.locator("main")).not.toContainText("Alma");
  await expect(pub.locator("main")).not.toContainText(groupName);
  await settle(pub);
  await snap(pub, testInfo, "affiliate-gift-page");
  await visitor.close();
  expect(errors).toEqual([]);
});

test("a list on Amazon.com opens with the group's US tracking ID", async ({ page, browser }, testInfo) => {
  const p = testInfo.project.name;
  const TAG_US = `raosantae2e-${p}-20`;
  await loginAs(page, { email: site(p), adminLevel: "SITE" });
  const r = page.request;
  expect((await mutate(r, "admin.addTrackingIds", { tags: [TAG_US] })).status()).toBe(200);
  // each store's IDs go in their own slot
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: TAG, tagUs: TAG })).status(),
  ).toBe(400);
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: TAG, tagUs: TAG_US })).status(),
  ).toBe(200);
  const admin = (await unwrap(await query(r, "admin.affiliate"))) as {
    groups: { id: string; tag: string | null; tagUs: string | null }[];
  };
  expect(admin.groups.find((g) => g.id === groupId)).toMatchObject({ tag: TAG, tagUs: TAG_US });

  // Alma moves to an amazon.com list: this season's gift page follows her
  await loginAs(page, { email: `aff-a-${p}@${E}` });
  expect(
    (
      await mutate(page.request, "profile.saveProfile", {
        firstName: "Alma",
        lastName: "Shopper",
        amazonWishlistUrl: "https://www.amazon.com/hz/wishlist/ls/E2EAFUS001",
      })
    ).status(),
  ).toBe(200);
  await loginAs(page, { email: `aff-b-${p}@${E}` });
  const [parcel] = await parcels(page.request);
  expect(parcel?.link).toBe(giftPath);
  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  expect((await pub.goto(giftPath))?.status()).toBe(200);
  // dev gets the US dummy ID; raosanta.uk would use TAG_US
  await expect(pub.getByRole("link", { name: "Open the wishlist on Amazon" })).toHaveAttribute(
    "href",
    /^https:\/\/www\.amazon\.com\/hz\/wishlist\/ls\/E2EAFUS001\?tag=raosantatest-20$/,
  );
  await expect(pub.getByText("Ad · Affiliate link", { exact: true })).toBeVisible();
  await visitor.close();

  // and back to her UK list for the tests below
  await loginAs(page, { email: `aff-a-${p}@${E}` });
  expect((await profile(page.request, "Alma", "E2EAFA0001")).status()).toBe(200);
});

test("switching the group off opens wishlists straight on Amazon", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: site(p), adminLevel: "SITE" });
  expect(
    (
      await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null, tagUs: null })
    ).status(),
  ).toBe(200);
  await page.goto("/admin/affiliate");
  const row = page.getByRole("row").filter({ hasText: groupName });
  await expect(row).toContainText("Off");
  await settle(page);
  await snap(page, testInfo, "affiliate-admin");

  await loginAs(page, { email: `aff-b-${p}@${E}` });
  const [parcel] = await parcels(page.request);
  expect(parcel?.viaGiftPage).toBe(false);
  expect(parcel?.link).toBe("https://www.amazon.co.uk/hz/wishlist/ls/E2EAFA0001");

  // the fixed gift page still answers, now with a plain link and no label,
  // even once the group is back to the season's dates (Day 18)
  await loginAs(page, { email: site(p), adminLevel: "SITE" });
  expect(
    (await mutate(page.request, "admin.setOpenEarly", { groupId, open: false })).status(),
  ).toBe(200);
  expect((await page.goto(giftPath))?.status()).toBe(200);
  await expect(page.getByRole("link", { name: "Open the wishlist on Amazon" })).toHaveAttribute(
    "href",
    "https://www.amazon.co.uk/hz/wishlist/ls/E2EAFA0001",
  );
  await expect(page.getByText("Ad · Affiliate link", { exact: true })).toHaveCount(0);
});

test("only site admins change affiliate settings; unknown gift pages 404", async ({
  page,
}, testInfo) => {
  await loginAs(page, { email: `aff-a-${testInfo.project.name}@${E}` });
  expect((await query(page.request, "admin.affiliate")).status()).toBe(403);
  expect(
    (await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: null })).status(),
  ).toBe(403);
  expect((await page.goto("/gift/not-a-real-token"))?.status()).toBe(404);
});

test("leaving releases pick-ups, and an emptied group's gift pages live on", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `aff-b-${p}@${E}` });
  expect((await parcels(page.request)).length).toBeGreaterThan(0);
  expect((await mutate(page.request, "groups.leave", { groupId })).status()).toBe(200);
  expect(await parcels(page.request)).toEqual([]);

  // the organiser leaves last: the group closes but isn't deleted
  await loginAs(page, { email: `aff-a-${p}@${E}` });
  const last = (await unwrap(await mutate(page.request, "groups.leave", { groupId }))) as {
    deleted: boolean;
  };
  expect(last.deleted).toBe(true);
  expect((await page.goto(giftPath))?.status()).toBe(200);
  await expect(page.getByRole("link", { name: "Open the wishlist on Amazon" })).toHaveAttribute(
    "href",
    /ls\/E2EAFA0001/,
  );
});

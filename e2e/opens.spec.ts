import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, trackPageErrors } from "./helpers";

/**
 * Wishlist opens (owner, 23 Oct 2026): clicking a link to Amazon is counted
 * on our own server, and the admin report shows opens by Amazon store,
 * including those we couldn't tag although affiliate links were on.
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

type Parcel = { id: string; link: string | null; viaGiftPage: boolean };
type Report = {
  stores: { store: string; opens: number; tagged: number; missed: number }[];
  groups: { id: string; opens: number }[];
};
let groupId = "";
let groupName = "";
let deParcel = "";
const who = (n: string, p: string) => `opens-${n}-${p}@${E}`;
const parcels = async (r: APIRequestContext) =>
  (await unwrap(await query(r, "wishlist.getMyAssignments", { groupId }))) as Parcel[];
const report = async (r: APIRequestContext) => (await unwrap(await query(r, "admin.opens"))) as Report;
const ourOpens = (rep: Report) => rep.groups.find((g) => g.id === groupId)?.opens ?? 0;

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: lists on amazon.de and amazon.co.uk in a group with affiliate links", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Opens ${p}`;
  const save = (first: string, url: string) =>
    mutate(page.request, "profile.saveProfile", { firstName: first, lastName: "Opens", amazonWishlistUrl: url });

  await loginAs(page, { email: who("de", p) });
  expect((await save("Dieter", "https://www.amazon.de/hz/wishlist/ls/E2EOPENDE1")).status()).toBe(200);
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  for (const [n, url] of [
    ["uk", "https://www.amazon.co.uk/hz/wishlist/ls/E2EOPENUK1"],
    ["santa", "https://www.amazon.co.uk/hz/wishlist/ls/E2EOPENSA1"],
  ] as const) {
    await loginAs(page, { email: who(n, p) });
    expect((await save(n, url)).status()).toBe(200);
    expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  }

  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  const r = page.request;
  expect((await mutate(r, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(r, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
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
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "ON", tag: null, tagUs: null })).status(),
  ).toBe(200);
});

test("opening a list on Amazon is counted: untagged stores show as missed", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await loginAs(page, { email: who("santa", p) });
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 2 })).status()).toBe(200);
  const mine = await parcels(page.request);
  const de = mine.find((x) => x.link?.includes("amazon.de"))!;
  const uk = mine.find((x) => x.viaGiftPage)!;
  // amazon.de has no Associates account of ours: straight to Amazon
  expect(de.viaGiftPage).toBe(false);
  expect(uk.link).toMatch(/^\/gift\//);
  deParcel = de.id;

  // click the amazon.de parcel in the group's page
  await page.goto("/");
  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: groupName }).click();
  const panel = page.getByRole("tabpanel", { name: groupName });
  const deLink = panel.locator(`a[href="${de.link}"]`);
  const counted = page.waitForRequest((req) => req.url().endsWith("/api/track/open") && req.method() === "POST");
  await deLink.click({ modifiers: [] });
  expect((await counted).postDataJSON()).toEqual({ assignmentId: de.id });

  // the UK list opens from its gift page; its Amazon button is counted too
  await page.goto(uk.link!);
  const counted2 = page.waitForRequest((req) => req.url().endsWith("/api/track/open"));
  await page.getByRole("link", { name: "Open the wishlist on Amazon" }).click();
  expect((await counted2).postDataJSON()).toEqual({ giftPage: uk.link!.replace("/gift/", "") });

  // the same click again within 30 seconds counts once
  expect((await page.request.post("/api/track/open", { data: { assignmentId: de.id } })).status()).toBe(204);
  expect(errors).toEqual([]);
});

test("the admin report shows opens by store and group; strangers can't add any", async ({
  page,
  playwright,
}, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  await expect.poll(async () => ourOpens(await report(page.request))).toBe(2);
  const rep = await report(page.request);
  expect(rep.stores.find((s) => s.store === "amazon.de")?.missed).toBeGreaterThanOrEqual(1);
  expect(rep.stores.find((s) => s.store === "amazon.co.uk")?.tagged).toBeGreaterThanOrEqual(1);

  await page.goto("/admin/affiliate");
  await expect(page.getByText("Wishlist opens")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "amazon.de" }).first()).toBeVisible();

  // someone else's pick-up, or no session: nothing is counted
  await loginAs(page, { email: who("uk", p) });
  expect((await page.request.post("/api/track/open", { data: { assignmentId: deParcel } })).status()).toBe(204);
  const { baseURL, proxy } = testInfo.project.use;
  const anon = await playwright.request.newContext({ baseURL, proxy });
  expect((await anon.post("/api/track/open", { data: { assignmentId: "x" } })).status()).toBe(401);
  expect((await anon.post("/api/track/open", { data: { nope: 1 } })).status()).toBe(400);
  await anon.dispose();
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  expect(ourOpens(await report(page.request))).toBe(2);
});

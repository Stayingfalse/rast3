import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs } from "./helpers";

/**
 * Day 19: fair-share hand-outs. Lists with the fewest gifts this season go
 * first, and nobody holds more than 5 un-gifted lists at once.
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

type Parcel = { id: string; link: string | null };
const MEMBERS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const list = (m: string) => `https://www.amazon.co.uk/hz/wishlist/ls/E2EFAIR00${m.toUpperCase()}`;
let groupId = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

const who = (m: string, p: string) => `fair-${m}-${p}@${E}`;
const parcels = async (r: APIRequestContext) =>
  (await unwrap(await query(r, "wishlist.getMyAssignments", { groupId }))) as Parcel[];

test("set up: an eight-person friends group, open early", async ({ page }, testInfo) => {
  test.setTimeout(120_000); // eight sign-ins and profiles
  const p = testInfo.project.name;
  let code = "";
  for (const m of MEMBERS) {
    await loginAs(page, { email: who(m, p) });
    // first profile with a wishlist = checked in for the season
    expect(
      (
        await mutate(page.request, "profile.saveProfile", {
          firstName: `Fair ${m.toUpperCase()}`,
          lastName: "Share",
          amazonWishlistUrl: list(m),
        })
      ).status(),
    ).toBe(200);
    if (m === "a") {
      const g = (await unwrap(
        await mutate(page.request, "groups.create", { name: `E2E Fair Share ${p}`, kind: "FRIENDS" }),
      )) as { id: string; joinCode: string };
      groupId = g.id;
      code = g.joinCode;
    } else {
      expect((await mutate(page.request, "groups.join", { code })).status()).toBe(200);
    }
  }
  await loginAs(page, { email: `fair-site-${p}@${E}`, adminLevel: "SITE" });
  const r = page.request;
  expect((await mutate(r, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(r, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  // plain Amazon links, so the test can tell lists apart
  expect(
    (await mutate(r, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })).status(),
  ).toBe(200);
});

test("a list that has had a gift waits until the others have", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  // b picks up one list and gifts it
  await loginAs(page, { email: who("b", p) });
  expect(
    (await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 })).status(),
  ).toBe(200);
  const [first] = await parcels(page.request);
  expect(first?.link).toBeTruthy();
  expect(
    (await mutate(page.request, "wishlist.markPurchase", { assignmentId: first!.id })).status(),
  ).toBe(200);
  const gifted = first!.link!;

  // c picks up three: the six lists with no gifts (or holders) come first
  await loginAs(page, { email: who("c", p) });
  expect(
    (await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 3 })).status(),
  ).toBe(200);
  const mine = (await parcels(page.request)).map((x) => x.link);
  expect(mine).toHaveLength(3);
  expect(mine).not.toContain(gifted);
});

test("nobody holds more than five un-gifted lists", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("d", testInfo.project.name) });
  const r = page.request;
  expect((await mutate(r, "wishlist.requestFromGroup", { groupId, count: 3 })).status()).toBe(200);
  // asked for three more: only two fit under the limit
  expect((await mutate(r, "wishlist.requestFromGroup", { groupId, count: 3 })).status()).toBe(200);
  expect(await parcels(r)).toHaveLength(5);
  const full = await mutate(r, "wishlist.requestFromGroup", { groupId, count: 1 });
  expect(full.status()).toBe(412);
  expect(await errorMessage(full)).toMatch(/holding 5 wishlists/);

  // gifting one makes room again
  const [one] = await parcels(r);
  expect((await mutate(r, "wishlist.markPurchase", { assignmentId: one!.id })).status()).toBe(200);
  expect((await mutate(r, "wishlist.requestFromGroup", { groupId, count: 1 })).status()).toBe(200);
});

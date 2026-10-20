import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/** Day 14: gifting inside a friends group, with the home-page switcher. */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = "e2e.raosanta.test";
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const profile = (r: APIRequestContext, first: string, list: string) =>
  mutate(r, "profile.saveProfile", {
    firstName: first,
    lastName: "Friend",
    amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/${list}`,
  });

let groupId = "";
let groupName = "";
let code = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("two friends set up a group that a site admin approves", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Book Club ${p}`;
  await loginAs(page, { email: `friend-a-${p}@${E}` });
  expect((await profile(page.request, "Ava", "E2EFRA0001")).status()).toBe(200);
  const created = (await unwrap(
    await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = created.id;
  code = created.joinCode;

  // pending: no pick-ups yet
  const early = await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 });
  expect(early.status()).toBe(412);

  await loginAs(page, { email: `friend-b-${p}@${E}` });
  expect((await profile(page.request, "Ben", "E2EFRB0001")).status()).toBe(200);
  expect((await mutate(page.request, "groups.join", { code })).status()).toBe(200);

  await loginAs(page, { email: `friend-site-${p}@${E}`, adminLevel: "SITE" });
  expect(
    (await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status(),
  ).toBe(200);
});

test("a member switches to the group, picks up a wishlist and gifts it", async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `friend-a-${testInfo.project.name}@${E}` });
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Gifting in" });
  await tabs.getByRole("tab", { name: groupName }).click();
  const panel = page.getByRole("tabpanel", { name: groupName });
  await expect(panel.getByRole("heading", { name: groupName })).toBeVisible();

  await panel.getByRole("button", { name: "Pick up a wishlist" }).click();
  const parcel = panel.getByRole("listitem").first();
  await expect(parcel.getByRole("link", { name: "Open wishlist" })).toHaveAttribute(
    "href",
    /E2EFRB0001$/,
  );
  await settle(page);
  await snap(page, testInfo, "group-home");

  await parcel.getByRole("button", { name: "Mark as gifted" }).click();
  await expect(parcel.getByText("Gifted. Thank you!")).toBeVisible();

  // nobody else left in the group
  await panel.getByRole("button", { name: "Pick up a wishlist" }).click();
  await expect(page.getByText(/No more wishlists in this group/)).toBeVisible();
  expect(errors).toEqual([]);
});

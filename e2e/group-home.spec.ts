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

/** Day 14: gifting inside a friends group, with the home-page switcher. */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const profile = (r: APIRequestContext, first: string, list: string) =>
  mutate(r, "profile.saveProfile", {
    over16: true,
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

test("two friends set up a group, live without approval (6 Nov)", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Book Club ${p}`;
  await loginAs(page, { email: `friend-a-${p}@${E}` });
  expect((await profile(page.request, "Ava", "E2EFRA0001")).status()).toBe(200);
  const created = (await unwrap(
    await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string; status: string };
  groupId = created.id;
  code = created.joinCode;
  // friends groups skip the approval queue
  expect(created.status).toBe("ACTIVE");

  await loginAs(page, { email: `friend-b-${p}@${E}` });
  expect((await profile(page.request, "Ben", "E2EFRB0001")).status()).toBe(200);
  expect((await mutate(page.request, "groups.join", { code })).status()).toBe(200);

  await loginAs(page, { email: `friend-site-${p}@${E}`, adminLevel: "SITE" });
  // gifting before the season opens needs the group opened early (Day 18)
  expect(
    (await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status(),
  ).toBe(200);
  // straight Amazon links here (affiliate gift pages have their own spec)
  expect(
    (
      await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })
    ).status(),
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

  // Ava's first gift ever: its own share window with this season's stamp
  // (4 Nov), and the card ready to share
  const sheet = page.getByRole("dialog", { name: "Your very first random act" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Welcome to Random Acts of Santa.", { exact: false })).toBeVisible();
  await expect(sheet.getByText(/You've collected the \d{4} stamp for your album/)).toBeVisible();
  const card = sheet.getByRole("img", { name: "Your share card" });
  await expect
    .poll(() => card.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1200);
  await settle(page);
  await snap(page, testInfo, "first-gift");
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(parcel.getByText("Gifted. Thank you!")).toBeVisible();

  // nobody else left in the group
  await panel.getByRole("button", { name: "Pick up a wishlist" }).click();
  await expect(page.getByText(/No more wishlists in this group/)).toBeVisible();
  expect(errors).toEqual([]);
});

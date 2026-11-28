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

  // the first pick-up gives up to 3, as at work (owner, 27 Nov); this group
  // has one other list
  await panel.getByRole("button", { name: "Pick up 3 wishlists" }).click();
  const parcel = panel.getByRole("article").first();
  // the same parcel card as at work: numbered, from this group
  await expect(parcel.getByText("Wishlist No. 01")).toBeVisible();
  await expect(parcel.getByText(groupName, { exact: true })).toBeVisible();
  await expect(parcel.getByRole("link", { name: "View Wishlist on Amazon" })).toHaveAttribute(
    "href",
    /E2EFRB0001$/,
  );
  await settle(page);
  await snap(page, testInfo, "group-home");

  // a list that can't be gifted can be reported here too (owner, 27 Nov),
  // and cleared once it's fixed
  await parcel.getByRole("button", { name: "Report issue" }).click();
  const reportDialog = page.getByRole("dialog").filter({ hasText: "Report Wishlist Issue" });
  await reportDialog.getByRole("combobox").selectOption("NO_ADDRESS");
  await reportDialog.getByRole("textbox").fill("No delivery address set");
  await reportDialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(parcel.getByText("Issue reported")).toBeVisible();
  await expect(parcel.getByText("Reported: No Shipping Address")).toBeVisible();
  await parcel.getByRole("button", { name: "It's fixed" }).click();
  await page.getByRole("button", { name: "Yes, it's fixed" }).click();
  await expect(parcel.getByText("Issue reported")).toHaveCount(0);

  // Gifted, with a note
  await parcel.getByRole("button", { name: "Gifted" }).click();
  const giftDialog = page.getByRole("dialog").filter({ hasText: "Mark Purchase Complete" });
  await giftDialog.getByRole("textbox").fill("Jaffa Cakes");
  await giftDialog.getByRole("button", { name: "Confirm Purchase" }).click();

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
  // and asks once whether they know another group (28 Nov)
  const another = sheet.getByRole("region", { name: "Know another group?" });
  await expect(another).toBeVisible();
  await expect(another.getByRole("link", { name: "Start a group" })).toHaveAttribute("href", "/groups");
  await expect(another.getByRole("button", { name: "Copy site link" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "first-gift");
  // what a phone shows once scrolled to it (a full-page capture resets the scroll)
  await another.getByRole("button", { name: "Copy site link" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/screenshots/${testInfo.project.name}/first-gift-another-group.png` });
  // a friends group's gift goes "to a friend", not "a colleague" (27 Nov)
  const cardPath = await sheet.getByRole("link", { name: "Save image" }).getAttribute("href");
  expect(cardPath).toMatch(/^\/sent\/\w+\/card\.png$/);
  const shared = await page.context().newPage();
  await shared.goto(cardPath!.replace(/\/card\.png$/, ""));
  await expect(shared.getByRole("img", { name: "Parcel label: to a friend, from Santa, address withheld" })).toBeVisible();
  await expect(shared.getByText("a few friends'", { exact: false })).toBeVisible();
  await shared.close();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
  // the SENT card, as at work
  await expect(parcel.getByText("Gift sent")).toBeVisible();
  await expect(parcel.getByText('"Jaffa Cakes"')).toBeVisible();
  await expect(parcel.getByRole("button", { name: "Share this act" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "group-home-gifted");

  // nobody else left in the group
  await panel.getByRole("button", { name: "Pick up another" }).click();
  await expect(page.getByText(/No more wishlists in this group/)).toBeVisible();
  expect(errors).toEqual([]);
});

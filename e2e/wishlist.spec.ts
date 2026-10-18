import { expect, test } from "@playwright/test";

import {
  hasTestLogin,
  loginAs,
  seed,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");

// Each test starts from a fresh seed. The data is left in place afterwards so
// dev.raosanta.uk always has a realistic dataset to browse.
let giverEmail = "";
test.beforeEach(async ({ request }) => {
  const summary = await seed(request);
  expect(summary.members).toBe(16);
  giverEmail = summary.giver.email;
});

test("member gets 3 wishlists and marks one as gifted", async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: giverEmail });
  await page.goto("/");

  await page
    .getByRole("button", { name: "Get My 3 Wishlist Assignments" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your Wishlist Assignments (3)" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /View Wishlist/ })).toHaveCount(
    3,
  );
  await settle(page);
  await snap(page, testInfo, "wishlist-assigned");

  // Stamp album: 2025 collected from last year's thank-you, 2026 still open.
  const album = page.getByRole("region", { name: "Your stamp album" });
  await expect(album.getByText("1 thank-you")).toBeVisible();
  await expect(album.getByText("Still to collect this season")).toBeVisible();

  await page.getByRole("button", { name: "Gifted" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Mark Purchase Complete" }),
  ).toBeVisible();
  await page
    .getByPlaceholder("What did you buy?")
    .fill("A very festive jumper");
  await page.getByRole("button", { name: "Confirm Purchase" }).click();

  // The giving share card is offered straight away and renders.
  const sheet = page.getByRole("dialog", { name: "Share your random act" });
  await expect(sheet).toBeVisible();
  const card = sheet.getByRole("img", { name: "Your share card" });
  await expect(card).toBeVisible();
  await expect
    .poll(() => card.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1200);
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);

  await expect(page.getByText(/Purchased:/)).toHaveCount(1);
  await expect(page.getByText('"A very festive jumper"')).toBeVisible();
  await expect(page.getByRole("button", { name: "Gifted" })).toHaveCount(2);
  await expect(album.getByText("1 gift", { exact: true })).toBeVisible();
  await expect(album.getByText("Still to collect this season")).toHaveCount(0);
  await settle(page);
  await snap(page, testInfo, "wishlist-gifted");
  expect(errors).toEqual([]);
});

test("a thank-you can be shared as a public card", async ({
  page,
  browser,
}, testInfo) => {
  await loginAs(page, { email: giverEmail });
  await page.goto("/");
  // The giver's own (seeded) thank-you carries a Share button.
  const postcard = page
    .getByRole("article")
    .filter({ hasText: "Last year's parcel was perfect" });
  await postcard.getByRole("button", { name: "Share" }).click();
  const sheet = page.getByRole("dialog", { name: "Share your thank-you" });
  const card = sheet.getByRole("img", { name: "Your share card" });
  await expect(card).toBeVisible();
  const src = await card.getAttribute("src");
  expect(src).toMatch(/^\/thanks\/[A-Za-z0-9]+\/card\.png$/);

  // Anyone can open the card's page, signed out, without names or addresses.
  const { baseURL, proxy } = testInfo.project.use;
  const visitor = await browser.newContext({ baseURL, proxy });
  const pub = await visitor.newPage();
  const res = await pub.goto(src!.replace(/\/card\.png$/, ""));
  expect(res?.status()).toBe(200);
  await expect(
    pub.getByRole("heading", { name: "Someone said thank you to their Santa" }),
  ).toBeVisible();
  await expect(
    pub.getByRole("img", { name: /Last year's parcel was perfect/ }),
  ).toBeVisible();
  await expect(pub.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/thanks\/[A-Za-z0-9]+\/card\.png$/,
  );
  await snap(pub, testInfo, "share-thanks-public");
  await visitor.close();
});

test("an organiser can share the organisation's total", async ({
  page,
  browser,
}, testInfo) => {
  // The seeded giver, made an organiser (site admin) for this test.
  await loginAs(page, { email: giverEmail, adminLevel: "SITE" });
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Your Christmas so far" });
  await expect(panel.getByText("10+").first()).toBeVisible();
  await panel
    .getByRole("button", { name: "Share the organisation total" })
    .click();

  const sheet = page.getByRole("dialog", { name: "Share your total" });
  const card = sheet.getByRole("img", { name: "Your share card" });
  await expect
    .poll(() => card.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1200);
  const src = await card.getAttribute("src");
  expect(src).toMatch(/^\/team\/[A-Za-z0-9]+\/card\.png$/);

  const { baseURL, proxy } = testInfo.project.use;
  const visitor = await browser.newContext({ baseURL, proxy });
  const pub = await visitor.newPage();
  const res = await pub.goto(src!.replace(/\/card\.png$/, ""));
  expect(res?.status()).toBe(200);
  await expect(
    pub.getByRole("heading", { name: /^A Christmas of random acts at / }),
  ).toBeVisible();
  await snap(pub, testInfo, "share-team-public");
  await visitor.close();
});

test("seeded kudos appear on the home page", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText(/mystery Santa/).first()).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "home-with-kudos");
});

test("admin overview shows the seeded org", async ({ page }, testInfo) => {
  await loginAs(page, {
    email: `admin-${testInfo.project.name}@e2e.raosanta.test`,
    adminLevel: "SITE",
  });
  await page.goto("/admin");
  await expect(page.getByText("Total Departments")).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-with-seed");
});

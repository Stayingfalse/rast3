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

test("member gets 3 wishlists and marks one as gifted", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: giverEmail });
  await page.goto("/");

  await page.getByRole("button", { name: "Get My 3 Wishlist Assignments" }).click();
  await expect(
    page.getByRole("heading", { name: "Your Wishlist Assignments (3)" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /View Wishlist/ })).toHaveCount(3);
  await settle(page);
  await snap(page, testInfo, "wishlist-assigned");

  await page.getByRole("button", { name: "Gifted" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Mark Purchase Complete" }),
  ).toBeVisible();
  await page.getByPlaceholder("What did you buy?").fill("A very festive jumper");
  await page.getByRole("button", { name: "Confirm Purchase" }).click();

  await expect(page.getByText(/Purchased:/)).toHaveCount(1);
  await expect(page.getByText('"A very festive jumper"')).toBeVisible();
  await expect(page.getByRole("button", { name: "Gifted" })).toHaveCount(2);
  await settle(page);
  await snap(page, testInfo, "wishlist-gifted");
  expect(errors).toEqual([]);
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

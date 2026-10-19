import { expect, test } from "@playwright/test";

import {
  deleteTestUsers,
  hasTestLogin,
  loginAs,
  seed,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/**
 * Day 12: profile is just you and your wishlist; then join or start a group.
 * Work emails only ever join an existing organisation, an unknown work domain
 * is offered "start it", and personal email providers are never organisations.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = "e2e.raosanta.test";

test.beforeAll(async ({ request }) => {
  await seed(request);
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a new member fills in their profile, then joins their workplace", async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await loginAs(page, { email: `onboard-${p}@${E}`, name: "Onboard" });
  await page.goto("/");

  const dialog = page.getByRole("dialog", { name: "Complete Your Profile" });
  await expect(dialog).toBeVisible();
  // no work email or department in the profile any more
  await expect(dialog.getByLabel(/work email/i)).toHaveCount(0);
  await dialog.getByLabel("First name").fill("Olive");
  await dialog.getByLabel("Last name").fill("Onboard");
  await dialog
    .getByLabel("Amazon UK wishlist link")
    .fill("https://www.amazon.co.uk/hz/wishlist/ls/E2EONB0001?ref_=x");
  await settle(page);
  await snap(page, testInfo, "onboarding-profile");
  await dialog.getByRole("button", { name: "Save and choose a group" }).click();

  await expect(page).toHaveURL(/\/groups\?welcome=1$/);
  await expect(page.getByText("Profile saved.")).toBeVisible();
  const workplace = page.getByRole("region", { name: "Join your workplace" });
  await workplace.getByLabel("Work email").fill(`olive-${p}@${E}`);
  await workplace.getByRole("button", { name: "Join workplace" }).click();

  const joined = page.getByRole("region", { name: E });
  await expect(joined.getByText("Live", { exact: true })).toBeVisible();
  await joined.getByLabel("Your team").selectOption({ label: "Elves Workshop" });
  await expect(page.getByText("Team saved")).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "onboarding-workplace-joined");

  // home now offers wishlists instead of "join a group"
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Join a group to start gifting" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a personal email is pointed to community groups, not an organisation", async ({
  page,
}, testInfo) => {
  await loginAs(page, { email: `personal-${testInfo.project.name}@${E}` });
  await page.goto("/groups");
  const workplace = page.getByRole("region", { name: "Join your workplace" });
  await workplace.getByLabel("Work email").fill("someone@gmail.com");
  await workplace.getByRole("button", { name: "Join workplace" }).click();
  await expect(workplace.getByText("That's a personal email address")).toBeVisible();
  await expect(workplace.getByRole("button", { name: /^Start / })).toHaveCount(0);
});

test("an unknown work domain offers to start an organisation", async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const domain = `startup-${testInfo.project.name}.${E}`;
  await loginAs(page, { email: `starter-${testInfo.project.name}@${E}` });
  // profile first (name and wishlist), as the real flow requires
  const saved = await page.request.post("/api/trpc/profile.saveProfile", {
    data: { json: { firstName: "Sam", lastName: "Starter" } },
  });
  expect(saved.status()).toBe(200);
  await page.goto("/groups");
  const workplace = page.getByRole("region", { name: "Join your workplace" });
  await workplace.getByLabel("Work email").fill(`sam@${domain}`);
  await workplace.getByRole("button", { name: "Join workplace" }).click();
  await expect(workplace.getByText(`${domain} isn't on Random Acts of Santa yet`)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "onboarding-start-organisation");
  await workplace.getByRole("button", { name: `Start ${domain}` }).click();

  const started = page.getByRole("region", { name: domain });
  await expect(started.getByText("Waiting for approval")).toBeVisible();
  // gifting waits for approval
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your organisation is waiting for approval" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

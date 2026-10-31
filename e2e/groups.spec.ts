import { expect, test } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/** Day 10: start a friends group and invite someone with a link. */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
let code = "";
let groupName = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a member starts a friends group and gets an invite code", async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  groupName = `E2E Quiz Team ${testInfo.project.name}`;
  await loginAs(page, { email: `organiser-${testInfo.project.name}@${E}` });
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Your groups", level: 1 })).toBeVisible();

  await page.getByLabel("Group name").fill(groupName);
  await page.getByRole("button", { name: "Start group" }).click();

  const card = page.getByRole("listitem").filter({ hasText: groupName });
  await expect(card).toBeVisible();
  await expect(card.getByText("Waiting for approval")).toBeVisible();
  await expect(card.getByText("1 member", { exact: true })).toBeVisible();
  const label = await card.getByLabel(/^Invite code /).getAttribute("aria-label");
  code = (label ?? "").replace("Invite code ", "").replace(/ /g, "");
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

  await settle(page);
  await snap(page, testInfo, "groups-organiser");
  expect(errors).toEqual([]);
});

test("a visitor sees the invite and is asked to sign in", async ({ page }) => {
  await page.goto(`/join/${code}`);
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to join" })).toBeVisible();
});

test("a friend joins with the link", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `friend-${testInfo.project.name}@${E}` });
  // lower case and a dash still work; signed in, opening the link doesn't
  // join (owner, 26 Oct): one tap does, then the profile, without leaving
  // the invite
  await page.goto(`/join/${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`);
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  await expect(page.getByText("waiting for our approval").first()).toBeVisible();
  await expect(page.getByText("Your email stays private.")).toBeVisible();
  await page.getByRole("button", { name: `Join ${groupName}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Complete Your Profile" })).toBeVisible();
  await dialog.getByLabel("First name").fill("Fran");
  await dialog.getByLabel("Last name").fill("Friend");
  await dialog.getByLabel("I'm 16 or over").check();
  await dialog.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(`You're in ${groupName}.`)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "join-invite");

  await page.getByRole("link", { name: "Your groups" }).click();
  await expect(page).toHaveURL(/\/groups$/);
  const card = page.getByRole("listitem").filter({ hasText: groupName });
  await expect(card.getByText("2 members")).toBeVisible();
  // only organisers see the code
  await expect(card.getByText("Invite code")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a wrong code is a 404", async ({ page }) => {
  const res = await page.goto("/join/ZZZZZZZZ");
  expect(res?.status()).toBe(404);
});

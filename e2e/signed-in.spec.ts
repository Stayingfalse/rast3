import { expect, test } from "@playwright/test";

import {
  deleteTestUsers,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");

const ADMIN_PAGES = [
  "/admin",
  "/admin/approvals",
  "/admin/groups",
  "/admin/users",
  "/admin/links",
  "/admin/kudos",
  "/admin/settings",
];

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test.describe("signed-in user", () => {
  test("test login creates a session", async ({ page }, testInfo) => {
    const email = `user-${testInfo.project.name}@e2e.raosanta.test`;
    await loginAs(page, { email, name: "E2E User" });

    const session = await page.request.get("/api/auth/session");
    const body = (await session.json()) as { user?: { email?: string } };
    expect(body.user?.email).toBe(email);
  });

  test("new user is asked to complete their profile", async ({ page }, testInfo) => {
    const errors = trackPageErrors(page);
    await loginAs(page, {
      email: `new-${testInfo.project.name}@e2e.raosanta.test`,
      name: "New Santa",
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Complete Your Profile", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Join Santa/ })).toHaveCount(0);
    await settle(page);
    await snap(page, testInfo, "signed-in-profile-setup");
    expect(errors).toEqual([]);
  });

  test("non-admin gets a 404 from /admin", async ({ page }, testInfo) => {
    await loginAs(page, {
      email: `plain-${testInfo.project.name}@e2e.raosanta.test`,
      adminLevel: "USER",
    });
    for (const path of ["/admin", "/admin/users"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "Return to sender" }),
      ).toBeVisible();
    }
  });
});

test.describe("site admin", () => {
  for (const path of ADMIN_PAGES) {
    test(`can open ${path}`, async ({ page }, testInfo) => {
      const errors = trackPageErrors(page);
      await loginAs(page, {
        email: `admin-${testInfo.project.name}@e2e.raosanta.test`,
        name: "E2E Admin",
        adminLevel: "SITE",
      });
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      await settle(page);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await snap(page, testInfo, `admin${path.replace(/\//g, "-")}`);
      expect(errors).toEqual([]);
    });
  }
});

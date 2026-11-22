import { expect, test, type Page } from "@playwright/test";

import { settle, snap, trackPageErrors } from "./helpers";

/**
 * While email sign-in links are failing (22 Nov), the sign-in window says so
 * and points to the other options, before anyone waits for a link. Dev has
 * no email server, so the browser is shown email sign-in and the status.
 */
async function withEmail(page: Page, down: boolean) {
  await page.route("**/api/auth/providers", async (route) => {
    const res = await route.fetch();
    const providers = (await res.json()) as Record<string, unknown>;
    providers.nodemailer ??= { id: "nodemailer", name: "Email", type: "email", signinUrl: "", callbackUrl: "" };
    await route.fulfill({ response: res, json: providers });
  });
  await page.route("**/api/email-status", (route) =>
    route.fulfill({ json: { down, since: down ? new Date().toISOString() : null } }),
  );
}

const NOTICE = "Email sign-in links aren't getting through right now.";

test("the status says up or down, and nothing more", async ({ request }) => {
  const res = await request.get("/api/email-status");
  expect(res.ok()).toBe(true);
  expect(res.headers()["cache-control"]).toContain("no-store");
  const body = (await res.json()) as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(["down", "since"]);
  // dev sends no email, so it's never down
  expect(body).toEqual({ down: false, since: null });
});

test("sign-in says when email links aren't getting through", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await withEmail(page, true);
  await page.goto("/?for=invited");
  await page.getByRole("button", { name: "Join your group" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(NOTICE)).toBeVisible();
  // email sign-in is still there: the notice only steers
  await expect(dialog.getByRole("button", { name: "Continue with Email" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "sign-in-email-down");
  expect(errors).toEqual([]);
});

test("no notice while email is working", async ({ page }) => {
  await withEmail(page, false);
  await page.goto("/?for=invited");
  await page.getByRole("button", { name: "Join your group" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Continue with Email" })).toBeVisible();
  await expect(dialog.getByText(NOTICE)).toHaveCount(0);
});

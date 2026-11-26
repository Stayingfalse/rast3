import { expect, test } from "@playwright/test";

import { settle, snap, trackPageErrors } from "./helpers";

/**
 * A failed sign-in lands on our own page (24 Nov), not Auth.js's unbranded
 * one, and it's never a dead end: its button opens the usual sign-in window.
 */
test("a used sign-in link says what happened and offers a new one", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await page.goto("/auth/error?error=Verification");
  await expect(page.getByRole("heading", { name: "This sign-in link has already been used" })).toBeVisible();
  await expect(page.getByText("Each link works once, within 24 hours")).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "sign-in-error-used-link");
  await page.getByRole("button", { name: "Get a new sign-in link" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(errors).toEqual([]);
});

test("any other sign-in error gets a plain message and a retry", async ({ page }) => {
  await page.goto("/auth/error?error=Configuration");
  await expect(page.getByRole("heading", { name: "We couldn't sign you in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the home page" })).toHaveAttribute("href", "/");
});

test("Auth.js sends failed sign-ins to our page", async ({ request }) => {
  const res = await request.get("/api/auth/error?error=Verification", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers().location).toContain("/auth/error?error=Verification");
});

test("the sign-in landing page only offers our own sign-in links (audit, 26 Nov)", async ({ page, baseURL }) => {
  // someone else's address: no button, so our page can't front a phishing link
  await page.goto(`/auth/magic?url=${encodeURIComponent("https://evil.example/api/auth/callback/nodemailer?token=x")}`);
  await expect(page.getByText("No valid sign-in link found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Click to Sign In" })).toHaveCount(0);
  // our own address but not the sign-in callback: no button either
  await page.goto(`/auth/magic?url=${encodeURIComponent(`${baseURL}/admin`)}`);
  await expect(page.getByText("No valid sign-in link found")).toBeVisible();
  // our sign-in callback: the button, pointing at it
  const real = `${baseURL}/api/auth/callback/nodemailer?callbackUrl=%2F&token=abc&email=a%40b.c`;
  await page.goto(`/auth/magic?url=${encodeURIComponent(real)}`);
  await expect(page.getByRole("link", { name: "Click to Sign In" })).toHaveAttribute("href", real);
});

test("too many sign-in requests gets its own message", async ({ page }) => {
  await page.goto("/auth/error?error=TooManyRequests");
  await expect(page.getByRole("heading", { name: "Too many sign-in links asked for" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in another way" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

import { settle, snap, trackPageErrors } from "./helpers";

const PUBLIC_PAGES = [
  { name: "home", path: "/" },
  { name: "privacy", path: "/privacy" },
];

test.describe("public pages", () => {
  for (const { name, path } of PUBLIC_PAGES) {
    test(`${name} loads without errors`, async ({ page }, testInfo) => {
      const errors = trackPageErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      await settle(page);
      await snap(page, testInfo, `public-${name}`);
      expect(errors).toEqual([]);
    });
  }

  test("the stamp rack re-prints the pitch for each visitor", async ({ page }, testInfo) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    const rack = page.getByRole("radiogroup", { name: /Who's posting/ });
    // invited members by default
    await expect(rack.getByRole("radio", { name: /been invited/i })).toBeChecked();
    await expect(page.getByRole("button", { name: "Join your group" }).first()).toBeVisible();

    // a Discord organiser presses their stamp: label, pitch and button follow
    await rack.getByRole("radio", { name: /run a Discord/i }).click();
    await expect(rack.getByRole("radio", { name: /run a Discord/i })).toBeChecked();
    await expect(page).toHaveURL(/[?&]for=discord/);
    await expect(page.getByText("A member you've only met in voice chat")).toBeVisible();
    await expect(page.getByRole("heading", { name: /A Christmas your server will talk about/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Link your Discord server" }).first()).toBeVisible();

    // arrow keys move along the rack
    await page.keyboard.press("ArrowRight");
    await expect(rack.getByRole("radio", { name: /my friends/i })).toBeChecked();
    await expect(rack.getByRole("radio", { name: /my friends/i })).toBeFocused();

    // a shared link opens on its pitch
    await page.goto("/?for=workplace");
    await expect(rack.getByRole("radio", { name: /run a workplace/i })).toBeChecked();
    await expect(page.getByRole("button", { name: "Set up your workplace" }).first()).toBeVisible();
    await settle(page);
    await snap(page, testInfo, "home-workplace");

    // the pitch's button opens sign-in
    await page.getByRole("button", { name: "Set up your workplace" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("unknown pages show the branded not-found page", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Return to sender" }),
    ).toBeVisible();
  });

  test("health endpoint reports a connected database", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      database: { connected: boolean };
      schemaSync: { result: string } | null;
    };
    expect(body.database.connected).toBe(true);
    // A startup schema sync must never leave drift or a failed migration.
    expect(body.schemaSync?.result ?? "skipped").not.toMatch(
      /drift|failed|foreign-history/,
    );
  });

  test("test login is hidden without the secret", async ({ request }) => {
    const res = await request.post("/api/test-auth/login", {
      data: { email: "nobody@e2e.raosanta.test" },
    });
    expect(res.status()).toBe(404);
  });
});

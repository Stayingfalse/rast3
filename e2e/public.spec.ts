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
    const group = page.getByRole("radiogroup", { name: "Which group" });
    const role = page.getByRole("radiogroup", { name: "Organising or invited" });
    // a colleague who's been invited, by default
    await expect(group.getByRole("radio", { name: "Our workplace" })).toBeChecked();
    await expect(role.getByRole("radio", { name: "I've been invited" })).toBeChecked();
    await expect(page.getByRole("button", { name: "Join your workplace" }).first()).toBeVisible();

    // a Discord organiser presses their stamps: label, pitch and button follow
    await group.getByRole("radio", { name: "Our Discord server" }).click();
    await role.getByRole("radio", { name: "I'm organising it" }).click();
    await expect(page).toHaveURL(/[?&]for=discord-run/);
    await expect(page.getByText("A member you've only met in voice chat").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /A Christmas your server will talk about/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Link your Discord server" }).first()).toBeVisible();
    // the small print skips what the pitch already answered
    await expect(page.getByText("Is my address private?")).toHaveCount(0);
    await expect(page.getByText("When does it run?")).toBeVisible();

    // arrow keys move along a row
    await group.getByRole("radio", { name: "Our Discord server" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Friends & family" })).toBeChecked();
    await expect(group.getByRole("radio", { name: "Friends & family" })).toBeFocused();
    await expect(page).toHaveURL(/[?&]for=friends-run/);

    // a shared link opens on its pitch (old links still work)
    await page.goto("/?for=discord-join");
    await expect(page.getByRole("button", { name: "Join with Discord" }).first()).toBeVisible();
    await page.goto("/?for=invited");
    await expect(page.getByRole("button", { name: "Join your group" }).first()).toBeVisible();
    await settle(page);
    await snap(page, testInfo, "home-friends-join");

    // the pitch's button opens sign-in
    await page.getByRole("button", { name: "Join your group" }).first().click();
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

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

  test("signed-out visitors see the Join Santa button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Join Santa/ })).toBeVisible();
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
    expect(body.schemaSync?.result ?? "skipped").not.toMatch(/drift|failed/);
  });

  test("test login is hidden without the secret", async ({ request }) => {
    const res = await request.post("/api/test-auth/login", {
      data: { email: "nobody@e2e.raosanta.test" },
    });
    expect(res.status()).toBe(404);
  });
});

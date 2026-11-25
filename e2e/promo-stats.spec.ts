import { expect, test } from "@playwright/test";

import type { PromoStats } from "../src/server/promo-stats";

/**
 * 17 Nov: GET /api/promo/stats, the figures the promo channel's videos quote.
 * Server to server: without the token it never answers with data. With
 * E2E_PROMO_API_TOKEN (dev's PROMO_API_TOKEN) the shape is checked: rounded
 * strings or null (hidden under 10), never a raw count.
 */
const TOKEN = process.env.E2E_PROMO_API_TOKEN ?? "";
const ROUNDED = /^\d{1,3}(,\d{3})*\+$/;

test.describe("promo stats", () => {
  test("refuses anyone without the token", async ({ request }) => {
    const tries: Record<string, string>[] = [
      {},
      { authorization: "Bearer not-the-token-not-the-token-not-it" },
    ];
    for (const headers of tries) {
      const r = await request.get("/api/promo/stats", { headers });
      expect([401, 404]).toContain(r.status());
      expect(await r.text()).not.toContain("allTime");
    }
  });

  test("gives rounded figures and the season's dates", async ({ request }) => {
    test.skip(!TOKEN, "E2E_PROMO_API_TOKEN not set");
    const r = await request.get("/api/promo/stats", {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(r.status()).toBe(200);
    const s = (await r.json()) as PromoStats;
    expect(["off-season", "drive", "open", "closed"]).toContain(s.season.phase);
    for (const d of [
      s.season.driveStartsOn,
      s.season.opensOn,
      s.season.closesOn,
    ])
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const group of [s.allTime, s.thisSeason, s.groups]) {
      for (const v of Object.values<string | null>(group)) {
        if (v !== null) expect(v).toMatch(ROUNDED);
      }
    }
  });
});

import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  seed,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/**
 * Day 27: Admin › Insights, for the 2027 monetisation case. Worked out from
 * what the site already records, counts only, site admins only.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const insights = (r: APIRequestContext, season?: number) =>
  r.get(`/api/trpc/admin.insights?input=${encodeURIComponent(JSON.stringify({ json: { season } }))}`);

type Insights = {
  year: number;
  current: number;
  seasons: number[];
  funnel: { step: string; count: number }[];
  byKind: { kind: string; gifts: number; members: number }[];
  weeks: { week: string; counts: Record<string, number> }[];
  affiliate: { opens: number; tagged: number };
};
const body = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: Insights } } }).result.data.json;

test.beforeAll(async ({ request }) => {
  await seed(request);
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("site admins get the season's funnel, kinds of group and weeks", async ({ page }, testInfo) => {
  await loginAs(page, { email: `insights-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  const res = await insights(page.request);
  expect(res.status()).toBe(200);
  const d = await body(res);
  expect(d.year).toBe(d.current);
  expect(d.funnel.map((f) => f.step)).toEqual([
    "Members",
    "Checked in",
    "In a group",
    "Picked up a list",
    "Gifted",
    "Received a gift",
    "Said it arrived",
    "Posted a thank-you",
  ]);
  // the seed has gifts this season, all in its workplace
  expect(d.funnel.find((f) => f.step === "Gifted")!.count).toBeGreaterThan(0);
  expect(d.byKind.map((k) => k.kind)).toEqual(["ORG", "COMMUNITY", "FRIENDS"]);
  expect(d.byKind[0]!.gifts).toBeGreaterThan(0);
  expect(d.weeks.length).toBeGreaterThan(0);
  // weeks start on Mondays
  expect(d.weeks.every((w) => new Date(`${w.week}T00:00:00Z`).getUTCDay() === 1)).toBe(true);
  // counts only: nothing about any one person
  expect(JSON.stringify(d)).not.toMatch(/@|userId|email|name"/);

  // last season too (the seed has a 2025 pick-up)
  expect(d.seasons).toContain(d.current - 1);
  const last = await body(await insights(page.request, d.current - 1));
  expect(last.year).toBe(d.current - 1);
});

test("nobody else can read them", async ({ page, request }, testInfo) => {
  expect((await insights(request)).status()).toBe(401);
  await loginAs(page, { email: `insights-member-${testInfo.project.name}@${E}` });
  expect((await insights(page.request)).status()).toBe(403);
  expect((await page.goto("/admin/insights"))?.status()).toBe(404);
});

test("the page shows the tables and downloads a CSV", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `insights-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  await page.goto("/admin/insights");
  await expect(page.getByRole("heading", { name: /Insights, Christmas/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Picked up a list" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Friends groups" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-insights");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^raosanta-insights-\d{4}\.csv$/);
  const csv = await (await download.createReadStream()).toArray();
  expect(Buffer.concat(csv).toString()).toContain("Funnel,People");
  expect(errors).toEqual([]);
});

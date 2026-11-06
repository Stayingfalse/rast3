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
 * Admin › Status (2 Nov): is launch going well or is something stuck? Counts
 * only, without test accounts, site admins only.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const status = (r: APIRequestContext) => r.get("/api/trpc/admin.status");

type Status = {
  attention: { key: string; text: string }[];
  people: { what: string; day: number; week: number }[];
  unfinished: number;
  groups: { pending: number; oldestHours: number | null; tooLong: boolean };
  emails: { kind: string; SENT: number; SKIPPED: number; FAILED: number }[];
  failed: number;
  latestFailed: { note: string | null } | null;
  emailServer: string;
  limit: { daily: number; used: number };
  today: { pickUps: number; gifts: number; thanks: number };
  season: { year: number; phase: string };
  health: { database: boolean; migrations: { applied: number; latest: string | null } | null; startedAt: string };
};
const body = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: Status } } }).result.data.json;

test.beforeAll(async ({ request }) => {
  await seed(request);
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("site admins get counts, emails, season and health", async ({ page }, testInfo) => {
  await loginAs(page, { email: `status-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  const res = await status(page.request);
  expect(res.status()).toBe(200);
  const d = await body(res);

  const isCount = (x: unknown) => typeof x === "number" && Number.isInteger(x) && x >= 0;
  expect(d.people.map((p) => p.what)).toEqual([
    "Finished profiles",
    "Checked in for Christmas",
    "Group joins",
    "Signed in and active",
  ]);
  for (const p of d.people) {
    expect(isCount(p.day) && isCount(p.week)).toBe(true);
    expect(p.week).toBeGreaterThanOrEqual(p.day);
  }
  expect(isCount(d.unfinished)).toBe(true);
  expect(isCount(d.groups.pending)).toBe(true);
  expect(d.emails.map((e) => e.kind)).toEqual([
    "CHECK_IN_NUDGE",
    "SEASON_OPEN",
    "GIFT_CHECK_IN",
    "NEW_LISTS",
    "ORGANISER_LIVE",
    "ADMIN_STATUS",
  ]);
  for (const e of d.emails) expect([e.SENT, e.SKIPPED, e.FAILED].every(isCount)).toBe(true);
  expect(isCount(d.failed)).toBe(true);
  expect(["environment", "admin settings", "none"]).toContain(d.emailServer);
  expect(d.limit.daily).toBeGreaterThan(0);
  expect(isCount(d.limit.used)).toBe(true);
  expect([d.today.pickUps, d.today.gifts, d.today.thanks].every(isCount)).toBe(true);
  expect(["before", "open", "after"]).toContain(d.season.phase);
  expect(d.health.database).toBe(true);
  expect(d.health.migrations?.latest).toBeTruthy();
  expect(Date.parse(d.health.startedAt)).not.toBeNaN();
  // the attention list agrees with the numbers it's drawn from
  expect(d.attention.some((a) => a.key === "mail-server")).toBe(d.emailServer === "none");
  expect(d.attention.some((a) => a.key === "failed")).toBe(d.failed > 0);
  expect(d.attention.some((a) => a.key === "pending")).toBe(d.groups.tooLong);

  // counts only: nothing about any one person, and no credentials
  expect(JSON.stringify(d)).not.toMatch(/@|userId|email"|name"|password|pass"|clientSecret|refreshToken/i);
});

test("test accounts aren't counted", async ({ page }, testInfo) => {
  await loginAs(page, { email: `status-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  const before = await body(await status(page.request));
  // a fresh test user signing in (profile unfinished) changes nothing
  await loginAs(page, { email: `status-new-${testInfo.project.name}@${E}` });
  await loginAs(page, { email: `status-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  const after = await body(await status(page.request));
  expect(after.unfinished).toBe(before.unfinished);
});

test("nobody else can read it", async ({ page, request }, testInfo) => {
  expect((await status(request)).status()).toBe(401);
  await loginAs(page, { email: `status-member-${testInfo.project.name}@${E}` });
  expect((await status(page.request)).status()).toBe(403);
  expect((await page.goto("/admin/status"))?.status()).toBe(404);
});

test("the page shows each section", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `status-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  await page.goto("/admin/status");
  await expect(page.getByRole("heading", { name: "Launch status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /needs attention/i })).toBeVisible();
  for (const name of ["People", "Groups waiting", "Reminder emails, last 24 hours", "App health"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByRole("cell", { name: "Finished profiles" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Gift check-in" })).toBeVisible();
  await expect(page.getByText("Picked up today")).toBeVisible();
  await expect(page.getByRole("link", { name: "Status", exact: true })).toHaveAttribute("aria-current", "page");
  // no sideways page scroll (tables scroll inside their box)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  // no addresses on the page
  await expect(page.locator("main")).not.toContainText(E);
  await settle(page);
  await snap(page, testInfo, "admin-status");
  expect(errors).toEqual([]);
});

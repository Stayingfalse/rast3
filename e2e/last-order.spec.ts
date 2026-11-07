import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  seed,
  settle,
  snap,
  testHeaders,
  trackPageErrors,
} from "./helpers";

/**
 * 6 Nov: the last-order countdown. A site admin sets Amazon UK's last day
 * for Christmas delivery; members who are gifting see how long they have
 * left, a "last day" line on the day, and a gentle note after it.
 *
 * Season dates are global on dev, so this spec sets the last-order date
 * near today (the countdown always gives at least ten days' notice, so a
 * date three days away shows now, in November) and puts dev's own value
 * back afterwards. The "from 10 December" rule itself is checked at pretend
 * dates through a test-only route that runs the same pure function.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const UK = "Europe/London";
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

/** yyyy-mm-dd in UK time, n days from now */
const ukDay = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: UK });
/** "Saturday 19 December" for a yyyy-mm-dd */
const label = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: UK,
  });

// Desktop and mobile run side by side against the same dev Season, so both
// only ever set these days, and each sets its day again right before it
// looks (a check retries if the other run changed it in between). Every
// day this spec sets is no more than 3 days ahead, so a date up to then
// (or in the past) is this run's, the other's or one an earlier run left
// behind (7 Nov: one stuck as "too late" on dev): both runs put back "no
// date". A later date is dev's own, and is put back as it was.
const LAST_TEST_DAY = 3;
let previous: string | null = null;
/** signed in as this run's site admin, apart from the page's member */
let admin: APIRequestContext;

async function setLastOrder(ymd: string | null) {
  const res = await mutate(admin, "admin.setLastOrder", { lastOrderAt: ymd });
  expect(res.status(), await res.text()).toBe(200);
}

/** Sets the date, loads the home page and checks the banner says `text` */
async function expectBanner(page: Page, scope: () => Locator, ymd: string, text: string) {
  await expect(async () => {
    await setLastOrder(ymd);
    await page.goto("/");
    await expect(
      scope().getByRole("status").filter({ hasText: "Christmas delivery" }),
    ).toHaveText(text, { timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
}

/** No hydration mismatches: React reports them on the console */
function trackHydration(page: Page) {
  const found: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) found.push(m.text());
  });
  return found;
}

test.beforeAll(async ({ playwright, request }, testInfo) => {
  await seed(request);
  const { baseURL, proxy } = testInfo.project.use;
  admin = await playwright.request.newContext({ baseURL, proxy });
  const login = await admin.post("/api/test-auth/login", {
    headers: testHeaders,
    data: { email: `lo-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" },
  });
  expect(login.status(), await login.text()).toBe(200);
  const season = (await unwrap(await query(admin, "admin.season"))) as {
    lastOrderAt: string | null;
  };
  const was = season.lastOrderAt
    ? new Date(season.lastOrderAt).toLocaleDateString("en-CA", { timeZone: UK })
    : null;
  previous = was && was > ukDay(LAST_TEST_DAY) ? was : null;
});

test.afterAll(async ({ playwright }, testInfo) => {
  if (admin) {
    await setLastOrder(previous);
    await admin.dispose();
  }
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("an admin sets the last-order date on Admin › Season", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `lo-site-${p}@${E}`, adminLevel: "SITE" });
  await page.goto("/admin/season");
  const field = page.getByLabel("Last order date");
  await expect(field).toBeVisible();
  await expect(
    page.getByText("Amazon UK's last day for standard Christmas delivery"),
  ).toBeVisible();
  await field.fill(ukDay(3));
  await page.getByRole("button", { name: "Save last order date" }).click();
  await expect(page.getByText("Last order date saved")).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-season-last-order");

  // only site admins
  await loginAs(page, { email: `lo-member-${p}@${E}` });
  expect(
    (await mutate(page.request, "admin.setLastOrder", { lastOrderAt: ukDay(3) })).status(),
  ).toBe(403);
});

test("a workplace Santa sees the countdown above their parcels", async ({ page }, testInfo) => {
  const day = ukDay(3);
  const errors = trackPageErrors(page);
  const hydration = trackHydration(page);
  // the seed's giver: checked in, workplace opened early, holding parcels
  await loginAs(page, { email: `giver@${E}` });
  await expectBanner(
    page,
    () => page.locator("main"),
    day,
    `Order by ${label(day)} for Christmas delivery · 3 days left`,
  );
  // it sits above the parcels
  const banner = page.getByRole("status").filter({ hasText: "Christmas delivery" });
  const parcels = page.locator("#assignments-section");
  const [b, a] = [await banner.boundingBox(), await parcels.boundingBox()];
  expect(b && a && b.y < a.y).toBe(true);
  await settle(page);
  await snap(page, testInfo, "last-order-countdown");

  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => v.id)).toEqual([]);
  // the page never scrolls sideways (mobile)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
  expect(hydration).toEqual([]);
});

test("a group's Santas see it on the group home, on the day and after", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  const name = `E2E Late Elves ${p}`;
  await loginAs(page, { email: `lo-friend-${p}@${E}` });
  expect(
    (
      await mutate(page.request, "profile.saveProfile", {
        over16: true,
        firstName: "Lola",
        lastName: "Late",
        amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2ELOR0001",
      })
    ).status(),
  ).toBe(200);
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name, kind: "FRIENDS" }),
  )) as { id: string };
  expect(
    (await mutate(admin, "groups.setStatus", { groupId: g.id, status: "ACTIVE" })).status(),
  ).toBe(200);
  // gifting before the season opens needs the group opened early
  expect(
    (await mutate(admin, "admin.setOpenEarly", { groupId: g.id, open: true })).status(),
  ).toBe(200);

  const home = () => page.getByRole("region", { name });
  const day = ukDay(3);
  await expectBanner(page, home, day, `Order by ${label(day)} for Christmas delivery · 3 days left`);
  const banner = home().getByRole("status").filter({ hasText: "Christmas delivery" });
  const pick = home().getByRole("button", { name: "Pick up a wishlist" });
  const [b, a] = [await banner.boundingBox(), await pick.boundingBox()];
  expect(b && a && b.y < a.y).toBe(true);
  await settle(page);
  await snap(page, testInfo, "last-order-group-home");

  // on the day itself
  await expectBanner(page, home, ukDay(0), "Last day to order for Christmas delivery");
  await settle(page);
  await snap(page, testInfo, "last-order-last-day");

  // after it: a gentle note while gifting is still open
  await expectBanner(
    page,
    home,
    ukDay(-1),
    "Too late for Christmas delivery? Gifts that arrive in the New Year are still random acts.",
  );
  await settle(page);
  await snap(page, testInfo, "last-order-late");
});

test("the countdown starts on 10 December (or ten days ahead of an earlier date)", async ({
  request,
}) => {
  // no date and gifting closed are checked here too, so dev's date is
  // never cleared mid-run
  const at = (now: string, lastOrderAt: string | null, giftingOpen = true) => ({
    now,
    lastOrderAt,
    giftingOpen,
  });
  const last = "2026-12-19T12:00:00.000Z";
  const early = "2026-12-05T12:00:00.000Z";
  const res = await request.post("/api/test-auth/last-order", {
    headers: testHeaders,
    data: {
      cases: [
        at("2026-12-09T23:00:00.000Z", last), // 9 Dec: not yet
        at("2026-12-10T00:30:00.000Z", last), // 10 Dec: 9 days left
        at("2026-12-18T23:30:00.000Z", last), // the day before: 1 day left
        at("2026-12-19T23:30:00.000Z", last), // the last day, late evening
        at("2026-12-20T00:30:00.000Z", last), // after it
        at("2026-12-15T12:00:00.000Z", last, false), // gifting not open: nothing
        at("2026-12-15T12:00:00.000Z", null), // no date: nothing
        at("2026-11-25T12:00:00.000Z", early), // early date, 10 days ahead: not yet
        at("2026-11-26T12:00:00.000Z", early), // 9 days ahead: starts
      ],
    },
  });
  expect(res.status(), await res.text()).toBe(200);
  const { notices } = (await res.json()) as { notices: unknown[] };
  expect(notices).toEqual([
    null,
    { state: "countdown", date: "Saturday 19 December", ymd: "2026-12-19", daysLeft: 9 },
    { state: "countdown", date: "Saturday 19 December", ymd: "2026-12-19", daysLeft: 1 },
    { state: "last-day", date: "Saturday 19 December", ymd: "2026-12-19" },
    { state: "late" },
    null,
    null,
    null,
    { state: "countdown", date: "Saturday 5 December", ymd: "2026-12-05", daysLeft: 9 },
  ]);
});

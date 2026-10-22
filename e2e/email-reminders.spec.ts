import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  testHeaders,
  trackPageErrors,
} from "./helpers";

/**
 * Reminder emails (22 Oct): a check-in nudge before gifting opens, a
 * "gifting is open" email, and one when a Santa sends you a gift. Test
 * addresses are never emailed, so the log records each as skipped.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

type Log = { kind: string; status: string; note: string | null; ref: string; email: string };
type Reminders = {
  window: { opensAt: string; closesAt: string };
  log: Log[];
  tokens: Record<string, { u: string; t: string }>;
};
const reminders = async (r: APIRequestContext, data: { now?: string; run?: boolean }) => {
  const res = await r.post("/api/test-auth/reminders", { headers: testHeaders, data });
  expect(res.status()).toBe(200);
  return (await res.json()) as Reminders;
};

const DAY = 24 * 3600_000;
const who = (name: string, p: string) => `rem-${name}-${p}@${E}`;
let opensAt = 0;
let groupId = "";
const mine = (log: Log[], p: string) => log.filter((l) => l.email.startsWith("rem-") && l.email.endsWith(`-${p}@${E}`));

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: checked in, not checked in, and opted out", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  const list = (n: string) => `https://www.amazon.co.uk/hz/wishlist/ls/E2EREM000${n}`;
  // a first profile with a wishlist is that season's check-in
  await loginAs(page, { email: who("in", p) });
  await mutate(page.request, "profile.saveProfile", { firstName: "Ina", lastName: "In", amazonWishlistUrl: list("1") });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Reminders ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;

  await loginAs(page, { email: who("out", p) });
  await mutate(page.request, "profile.saveProfile", { firstName: "Otto", lastName: "Out" });

  await loginAs(page, { email: who("off", p) });
  await mutate(page.request, "profile.saveProfile", { firstName: "Ofelia", lastName: "Off", emailReminders: false });

  await loginAs(page, { email: who("santa", p) });
  await mutate(page.request, "profile.saveProfile", { firstName: "Sam", lastName: "Santa", amazonWishlistUrl: list("2") });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);

  await loginAs(page, { email: `rem-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  // plain Amazon links: no gift pages needed here
  expect(
    (await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })).status(),
  ).toBe(200);

  opensAt = Date.parse((await reminders(page.request, { run: false })).window.opensAt);
});

test("two weeks before gifting opens, members who haven't checked in are nudged once", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  // three weeks out: too early
  let r = await reminders(page.request, { now: new Date(opensAt - 21 * DAY).toISOString() });
  expect(mine(r.log, p)).toEqual([]);

  r = await reminders(page.request, { now: new Date(opensAt - 7 * DAY).toISOString() });
  expect(mine(r.log, p).map((l) => [l.email, l.kind, l.status, l.note])).toEqual([
    [who("out", p), "CHECK_IN_NUDGE", "SKIPPED", "test address"],
  ]);
  // running again sends nothing new
  r = await reminders(page.request, { now: new Date(opensAt - 6 * DAY).toISOString() });
  expect(mine(r.log, p)).toHaveLength(1);
});

test("when gifting opens, members hear about it once (not the one who opted out)", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  const r = await reminders(page.request, { now: new Date(opensAt + DAY).toISOString() });
  const open = mine(r.log, p).filter((l) => l.kind === "SEASON_OPEN");
  expect(open.map((l) => l.email).sort()).toEqual([who("in", p), who("out", p), who("santa", p)].sort());
  // a week later: nothing more
  const again = await reminders(page.request, { now: new Date(opensAt + 9 * DAY).toISOString() });
  expect(mine(again.log, p)).toHaveLength(mine(r.log, p).length);
});

test("a gift on your list emails you, and the buyer learns nothing about you", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("santa", p) });
  expect(
    (await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 })).status(),
  ).toBe(200);
  const [parcel] = (await unwrap(
    await page.request.get(
      `/api/trpc/wishlist.getMyAssignments?input=${encodeURIComponent(JSON.stringify({ json: { groupId } }))}`,
    ),
  )) as { id: string }[];
  const res = await mutate(page.request, "wishlist.markPurchase", { assignmentId: parcel!.id });
  expect(res.status()).toBe(200);
  const purchase = (await unwrap(res)) as Record<string, unknown>;
  expect(purchase).not.toHaveProperty("wishlistAssignment");

  await expect
    .poll(async () =>
      mine((await reminders(page.request, { run: false })).log, p)
        .filter((l) => l.kind === "GIFT_RECEIVED")
        .map((l) => [l.email, l.ref]),
    )
    .toEqual([[who("in", p), purchase.id]]);
});

test("the stop link turns reminders off and back on", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  const { tokens } = await reminders(page.request, { run: false });
  const { u, t } = tokens[who("in", p)]!;

  await page.goto(`/unsubscribe?u=${u}&t=wrong${t.slice(5)}`);
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();

  await page.goto(`/unsubscribe?u=${u}&t=${t}`);
  await expect(page.getByRole("heading", { name: "Stop reminder emails?" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "unsubscribe");
  await page.getByRole("button", { name: "Stop reminder emails" }).click();
  await expect(page.getByRole("heading", { name: "Done: no more reminders" })).toBeVisible();
  await page.getByRole("button", { name: "Turn reminders back on" }).click();
  await expect(page.getByRole("heading", { name: "Reminders are back on" })).toBeVisible();

  // mail apps' one-click unsubscribe
  const oneClick = await page.request.post(`/api/email/unsubscribe?u=${u}&t=${t}`, {
    form: { "List-Unsubscribe": "One-Click" },
  });
  expect(oneClick.status()).toBe(200);
  await page.goto(`/unsubscribe?u=${u}&t=${t}`);
  await expect(page.getByRole("heading", { name: "Reminders are off" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("members switch reminders on or off in their profile", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: who("off", testInfo.project.name) });
  await page.goto("/");
  await page.getByRole("button", { name: "Edit profile" }).click();
  const box = page.getByRole("checkbox", { name: "Reminder emails" });
  await expect(box).not.toBeChecked();
  await box.click();
  await expect(box).toBeChecked();
  await settle(page);
  await snap(page, testInfo, "profile-reminders");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const me = (await unwrap(
    await page.request.get(
      `/api/trpc/profile.getCurrentProfile?input=${encodeURIComponent(JSON.stringify({ json: null }))}`,
    ),
  )) as { emailReminders: boolean };
  expect(me.emailReminders).toBe(true);
  expect(errors).toEqual([]);
});

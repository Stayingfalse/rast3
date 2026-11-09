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
  run: { organisersLive: number; adminStatus: number; opened: number; quiet?: boolean } | null;
  log: Log[];
  tokens: Record<string, { u: string; t: string }>;
};
const reminders = async (
  r: APIRequestContext,
  data: { now?: string; run?: boolean; backdate?: string[]; quietHours?: boolean },
) => {
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
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Ina", lastName: "In", amazonWishlistUrl: list("1") });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Reminders ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;

  await loginAs(page, { email: who("out", p) });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Otto", lastName: "Out" });

  // a member from last year who hasn't come back yet (owner, 26 Oct: never emailed)
  await loginAs(page, { email: who("old", p) });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Olga", lastName: "Old" });

  await loginAs(page, { email: who("off", p) });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Ofelia", lastName: "Off", emailReminders: false });

  await loginAs(page, { email: who("santa", p) });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Sam", lastName: "Santa", amazonWishlistUrl: list("2") });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);

  await loginAs(page, { email: `rem-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  // plain Amazon links: no gift pages needed here
  expect(
    (await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })).status(),
  ).toBe(200);

  opensAt = Date.parse(
    (await reminders(page.request, { run: false, backdate: [who("old", p)] })).window.opensAt,
  );
});

test("two weeks before gifting opens, this season's members who haven't checked in are nudged once", async ({
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

/**
 * Launch emails (6 Nov). Organisers of live groups hear they're live once
 * gifting opens; site admins get a morning status email each UK day from the
 * day before it opens to a week after, from 07:00.
 */
const HOUR = 3600_000;
const ukDate = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
/** The time that is hh:mm UK time, `days` UK days after the day gifting opens. */
const ukAt = (days: number, hh: number, mm = 0) => {
  const [y, m, d] = ukDate(opensAt).split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(y, m - 1, d + days, hh, mm);
  const wall = (tz: string) => Date.parse(new Date(guess).toLocaleString("en-US", { timeZone: tz }));
  return guess - (wall("Europe/London") - wall("UTC"));
};
const kindOf = (log: Log[], kind: string, email: string) =>
  log.filter((l) => l.kind === kind && l.email === email);

test("organisers of live groups hear they're live once gifting opens", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  // an organiser whose group still waits for approval (a community: friends
  // groups go live straight away)
  await loginAs(page, { email: who("pend", p) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Pia",
    lastName: "Pending",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EREM0003",
  });
  expect((await mutate(page.request, "groups.create", { name: `E2E Pending ${p}`, kind: "COMMUNITY" })).status()).toBe(200);
  // an organiser of a live group who has stopped reminders
  await loginAs(page, { email: who("off", p) });
  const offGroup = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Opted out ${p}`, kind: "COMMUNITY" }),
  )) as { id: string };
  await loginAs(page, { email: `rem-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId: offGroup.id, status: "ACTIVE" })).status()).toBe(200);

  const live = async (t: number) =>
    mine((await reminders(page.request, { now: new Date(t).toISOString() })).log, p)
      .filter((l) => l.kind === "ORGANISER_LIVE")
      .map((l) => [l.email, l.status, l.ref]);
  // not before it opens
  expect(await live(opensAt - HOUR)).toEqual([]);
  // on the day: Ina, who organises the live group; not Santa (a member), nor
  // the pending group's organiser, nor the one who opted out
  expect(await live(opensAt + HOUR)).toEqual([[who("in", p), "SKIPPED", groupId]]);
  // and only once
  expect(await live(opensAt + 2 * DAY)).toEqual([[who("in", p), "SKIPPED", groupId]]);
});

test("site admins get the status email once a UK morning in launch week", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  const boss = who("boss", p);
  const bossOff = who("bossoff", p);
  await loginAs(page, { email: boss, adminLevel: "SITE" });
  await loginAs(page, { email: bossOff, adminLevel: "SITE" });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Bea", lastName: "Off", emailReminders: false });

  const at = async (t: number) => {
    const r = await reminders(page.request, { now: new Date(t).toISOString() });
    expect(kindOf(r.log, "ADMIN_STATUS", bossOff)).toEqual([]);
    return { count: r.run!.adminStatus, refs: kindOf(r.log, "ADMIN_STATUS", boss).map((l) => l.ref) };
  };
  // two days before gifting opens: too early
  expect((await at(ukAt(-2, 9))).count).toBe(0);
  // before 07:00 UK time: not yet
  const day4 = ukDate(ukAt(4, 12));
  let r = await at(ukAt(4, 6, 30));
  expect(r.count).toBe(0);
  expect(r.refs).not.toContain(day4);
  // from 07:00: once that day, logged as a test address
  r = await at(ukAt(4, 7, 5));
  expect(r.refs.filter((d) => d === day4)).toHaveLength(1);
  const logged = kindOf((await reminders(page.request, { run: false })).log, "ADMIN_STATUS", boss);
  expect(logged.every((l) => l.status === "SKIPPED" && l.note === "test address")).toBe(true);
  r = await at(ukAt(4, 21));
  expect(r.refs.filter((d) => d === day4)).toHaveLength(1);
  // the next morning, and the last day of the week
  r = await at(ukAt(5, 7));
  expect(r.refs).toContain(ukDate(ukAt(5, 12)));
  r = await at(ukAt(7, 23, 30));
  expect(r.refs).toContain(ukDate(ukAt(7, 12)));
  // eight days after opening: over
  const before = r.refs.length;
  r = await at(ukAt(8, 8));
  expect(r.count).toBe(0);
  expect(r.refs).toHaveLength(before);
});

test("when gifting opens, members hear about it once (not the one who opted out, nor last year's)", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  const r = await reminders(page.request, { now: new Date(opensAt + DAY).toISOString() });
  const open = mine(r.log, p).filter((l) => l.kind === "SEASON_OPEN");
  // (Pia, the pending group's organiser, is a member like any other)
  expect(open.map((l) => l.email).sort()).toEqual(
    [who("in", p), who("out", p), who("pend", p), who("santa", p)].sort(),
  );
  // a week later: nothing more
  const again = await reminders(page.request, { now: new Date(opensAt + 9 * DAY).toISOString() });
  expect(mine(again.log, p)).toHaveLength(mine(r.log, p).length);
});

const parcels = async (r: APIRequestContext) =>
  (await unwrap(
    await r.get(
      `/api/trpc/wishlist.getMyAssignments?input=${encodeURIComponent(JSON.stringify({ json: { groupId } }))}`,
    ),
  )) as { id: string }[];
let giftedAt = 0;

test("marking a gift sends nothing that day, and the buyer learns nothing about the owner", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  // Santa gifts Ina's list; Ina gifts Santa's
  await loginAs(page, { email: who("santa", p) });
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 })).status()).toBe(200);
  const res = await mutate(page.request, "wishlist.markPurchase", { assignmentId: (await parcels(page.request))[0]!.id });
  expect(res.status()).toBe(200);
  expect((await unwrap(res)) as object).not.toHaveProperty("wishlistAssignment");
  giftedAt = Date.now();

  await loginAs(page, { email: who("in", p) });
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 })).status()).toBe(200);
  const gifted = await mutate(page.request, "wishlist.markPurchase", {
    assignmentId: (await parcels(page.request))[0]!.id,
  });
  const santaGift = (await unwrap(gifted)) as { id: string };

  // Santa has already said thank you
  await loginAs(page, { email: who("santa", p) });
  expect(
    (
      await mutate(page.request, "kudos.createKudos", {
        message: "Thank you, mystery Santa!",
        purchaseId: santaGift.id,
        images: [],
      })
    ).status(),
  ).toBe(200);

  // two days on: too soon for anything (it would spoil the surprise)
  const r = await reminders(page.request, { now: new Date(giftedAt + 2 * DAY).toISOString() });
  expect(mine(r.log, p).filter((l) => l.kind === "GIFT_CHECK_IN")).toEqual([]);
});

test("days later, a check-in goes only to someone sent a gift who hasn't said thanks", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  const checkIns = async (days: number) =>
    mine((await reminders(page.request, { now: new Date(giftedAt + days * DAY).toISOString() })).log, p)
      .filter((l) => l.kind === "GIFT_CHECK_IN")
      .map((l) => l.email);
  // not Santa (thanked already), not Otto or Ofelia (nobody sent them anything)
  expect(await checkIns(5)).toEqual([who("in", p)]);
  // and only once
  expect(await checkIns(6)).toEqual([who("in", p)]);
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

/**
 * Quiet hours (9 Nov): the hourly schedule holds members' and organisers'
 * emails outside 08:00–21:00 UK time, so the 15 November midnight opening
 * doesn't send hundreds at once; site admins' status email keeps 07:00.
 */
test("the hourly schedule keeps members' emails to the day, admins' status from 07:00", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  const boss = who("quietboss", p);
  await loginAs(page, { email: boss, adminLevel: "SITE" });
  const at = async (t: number) => {
    const r = await reminders(page.request, { now: new Date(t).toISOString(), quietHours: true });
    return { run: r.run!, status: kindOf(r.log, "ADMIN_STATUS", boss).map((l) => l.ref) };
  };
  // 02:00 the night gifting opens: nothing for members or organisers
  let r = await at(ukAt(1, 2));
  expect(r.run).toMatchObject({ quiet: true, opened: 0, organisersLive: 0 });
  // 07:05: still quiet for members, but the site admins' status goes
  r = await at(ukAt(6, 7, 5));
  expect(r.run.quiet).toBe(true);
  expect(r.status).toContain(ukDate(ukAt(6, 12)));
  // 09:00 and 20:30: the day's emails go; 21:00: quiet again
  expect((await at(ukAt(6, 9))).run.quiet).toBeUndefined();
  expect((await at(ukAt(6, 20, 30))).run.quiet).toBeUndefined();
  expect((await at(ukAt(6, 21))).run.quiet).toBe(true);
});


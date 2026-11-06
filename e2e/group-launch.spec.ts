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
 * Per-group launch dates (owner, 7 Nov): every group opens on the season's
 * date unless its organiser or a site admin picks another day. Organisers
 * can pick today or later until the group opens; site admins any time.
 * Gifting, the group's pages and the launch emails follow the group's date.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const DAY = 24 * 3600_000;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const errorMessage = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { error: { json: { message: string } } }).error.json.message;

/** A UK calendar day, `days` from today ("2026-11-10"). */
const ukDay = (days: number) =>
  new Date(Date.now() + days * DAY).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
/** How the site writes that day ("Tuesday 10 November"). */
const longDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  });

/** Unique per project and attempt, so a retry starts from fresh accounts. */
const who = (name: string, testInfo: { project: { name: string }; retry: number }) =>
  `gl-${name}-${testInfo.project.name}-${testInfo.retry}@${E}`;

type Saved = { opensAt: string; own: boolean; open: boolean };
type Mine = { id: string; opensAt: string; open: boolean; opensLater: boolean }[];
const state = { groupId: "", joinCode: "", name: "", later: "" };

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("an organiser picks a later launch date: the group waits until then", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  state.name = `E2E Launch Later ${p}`;
  state.later = ukDay(3);
  await loginAs(page, { email: who("host", testInfo) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Lana",
    lastName: "Launch",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EGL00001",
  });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: state.name, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  state.groupId = g.id;
  state.joinCode = g.joinCode;

  // not in the past, not after gifting closes
  const past = await mutate(page.request, "groups.setLaunchDate", { groupId: g.id, date: ukDay(-2) });
  expect(past.status()).toBe(400);
  expect(await errorMessage(past)).toMatch(/today or a day after/);
  const tooLate = await mutate(page.request, "groups.setLaunchDate", { groupId: g.id, date: "2099-01-01" });
  expect(tooLate.status()).toBe(400);

  const saved = await mutate(page.request, "groups.setLaunchDate", { groupId: g.id, date: state.later });
  expect(saved.status(), await saved.text()).toBe(200);
  expect((await unwrap(saved)) as Saved).toMatchObject({ own: true, open: false });

  // a member can't pick up yet, and is told when they can
  await loginAs(page, { email: who("member", testInfo) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Max",
    lastName: "Member",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EGL00002",
  });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  const mine = (await unwrap(await query(page.request, "groups.mine"))) as Mine;
  expect(mine.find((x) => x.id === g.id)).toMatchObject({ open: false, opensLater: true });
  const wait = await mutate(page.request, "wishlist.requestFromGroup", { groupId: g.id, count: 1 });
  expect(wait.status()).toBe(412);
  expect(await errorMessage(wait)).toMatch(/Gifting opens on/);

  // the group's home says when, and there's no pick-up button yet
  const errors = trackPageErrors(page);
  await page.goto("/");
  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: state.name }).click();
  const home = page.getByRole("tabpanel", { name: state.name });
  await expect(home.getByText(`Gifting opens in this group on ${longDay(state.later)}.`)).toBeVisible();
  await expect(home.getByRole("button", { name: "Pick up a wishlist" })).toHaveCount(0);
  await settle(page);
  await snap(page, testInfo, "group-launch-waiting");
  expect(errors).toEqual([]);
});

test("the organiser's console shows the date and can put it back to the site's", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("host", testInfo) });
  const errors = trackPageErrors(page);
  await page.goto(`/groups/${state.groupId}/manage`);
  await expect(page.getByText(/^Gifting opens \d+ \w{3}$/)).toBeVisible();
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByText(`${longDay(state.later)}`, { exact: false }).first()).toBeVisible();
  await expect(page.getByText("(this group's own date)")).toBeVisible();
  await expect(page.getByLabel("Gifting opens on")).toHaveValue(state.later);
  await settle(page);
  await snap(page, testInfo, "group-launch-console");

  // back to the site's date, then set again through the form (only while
  // the site's date is still to come: after it, going back opens the group)
  const { launch } = (await unwrap(
    await query(page.request, "groups.manage", { groupId: state.groupId }),
  )) as { launch: { siteOpensAt: string } };
  if (Date.parse(launch.siteOpensAt) > Date.now()) {
    await page.getByRole("button", { name: /Use the site's date/ }).click();
    await expect(page.getByText("(the site's date)")).toBeVisible();
    await page.getByLabel("Gifting opens on").fill(state.later);
    await page.getByRole("button", { name: "Save date" }).click();
    await expect(page.getByText("(this group's own date)")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("launch emails follow the group's own date", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("host", testInfo) });
  const launch = Date.parse(
    ((await unwrap(await query(page.request, "groups.manage", { groupId: state.groupId }))) as {
      launch: Saved;
    }).launch.opensAt,
  );
  const run = async (at: number) => {
    const res = await page.request.post("/api/test-auth/reminders", {
      headers: testHeaders,
      data: { now: new Date(at).toISOString() },
    });
    expect(res.status()).toBe(200);
    return ((await res.json()) as { log: { kind: string; email: string; ref: string }[] }).log;
  };
  const live = (log: { kind: string; email: string; ref: string }[]) =>
    log.filter((l) => l.kind === "ORGANISER_LIVE" && l.ref === state.groupId).map((l) => l.email);

  // the hour before it opens: nothing for this group
  expect(live(await run(launch - 3600_000))).toEqual([]);
  // once it opens: its organiser hears it's live, and its member that gifting is open
  const log = await run(launch + 3600_000);
  expect(live(log)).toEqual([who("host", testInfo)]);
  expect(log.filter((l) => l.kind === "SEASON_OPEN").map((l) => l.email)).toContain(who("member", testInfo));
});

test("once it opens the organiser can't move it; a site admin can", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("host", testInfo) });
  const today = await mutate(page.request, "groups.setLaunchDate", { groupId: state.groupId, date: ukDay(0) });
  expect(today.status(), await today.text()).toBe(200);
  expect((await unwrap(today)) as Saved).toMatchObject({ own: true, open: true });

  // open: the member picks up straight away
  await loginAs(page, { email: who("member", testInfo) });
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId: state.groupId, count: 1 })).status()).toBe(200);

  await loginAs(page, { email: who("host", testInfo) });
  const moved = await mutate(page.request, "groups.setLaunchDate", { groupId: state.groupId, date: state.later });
  expect(moved.status()).toBe(403);
  expect(await errorMessage(moved)).toMatch(/already opened/);
  // and a member who doesn't organise it can't at all
  await loginAs(page, { email: who("member", testInfo) });
  expect((await mutate(page.request, "groups.setLaunchDate", { groupId: state.groupId, date: null })).status()).toBe(403);

  // a site admin sees it on Admin › Season and Admin › Groups, and can move it
  await loginAs(page, { email: who("site", testInfo), adminLevel: "SITE" });
  const errors = trackPageErrors(page);
  await page.goto("/admin/season");
  const item = page.getByRole("listitem").filter({ hasText: state.name });
  await expect(item.getByText(/^Open since /)).toBeVisible();

  await page.goto("/admin/groups");
  await page.getByLabel("Search").fill(state.name);
  // the search waits a moment before filtering; open the menu once the list
  // has settled on this group, or the refresh closes it
  await expect(page.getByText("1 group", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Actions for ${state.name}` }).click();
  await page.getByRole("menuitem", { name: "Gifting date…" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Gifting opened here on/)).toBeVisible();
  await dialog.getByLabel("Gifting opens on").fill(state.later);
  await settle(page);
  await snap(page, testInfo, "admin-group-launch-dialog");
  await dialog.getByRole("button", { name: "Save date" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: state.name }).getByText(/Opens \d+ \w{3}/)).toBeVisible();

  const back = await mutate(page.request, "admin.setLaunchDate", { groupId: state.groupId, date: null });
  expect(back.status()).toBe(200);
  expect(((await unwrap(back)) as Saved).own).toBe(false);
  expect(errors).toEqual([]);
});

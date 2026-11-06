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
 * Friends groups go live as soon as they're started (owner, 6 Nov);
 * communities still wait for a site admin. Big friends groups and the past
 * week's new ones are listed on Admin › Approvals, and one person can start
 * only a few friends groups a season.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const errorMessage = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { error: { json: { message: string } } }).error.json.message;
const profile = (r: APIRequestContext, first: string, list: string) =>
  mutate(r, "profile.saveProfile", {
    over16: true,
    firstName: first,
    lastName: "Auto",
    amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/${list}`,
  });

type Created = { id: string; joinCode: string; status: string };
type Row = { id: string; name: string; members: number };
type DiscordRow = Row & {
  server: { name: string | null; members: number | null; online: number | null; features: string[]; linkedBy: string | null; isNew: boolean };
};
type ToCheck = { over: number; days: number; large: Row[]; recent: Row[]; discord: DiscordRow[] };

/** Unique per project and attempt, so a retry starts from fresh accounts. */
const who = (name: string, testInfo: { project: { name: string }; retry: number }) =>
  `aa-${name}-${testInfo.project.name}-${testInfo.retry}@${E}`;

const state = { friendsId: "", friendsName: "", communityId: "", bigId: "", bigName: "" };

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a new friends group is live at once; a new community still waits", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  state.friendsName = `E2E Live Friends ${p}`;
  await loginAs(page, { email: who("host", testInfo) });
  expect((await profile(page.request, "Hal", "E2EAA00001")).status()).toBe(200);
  const friends = (await unwrap(
    await mutate(page.request, "groups.create", { name: state.friendsName, kind: "FRIENDS" }),
  )) as Created;
  expect(friends.status).toBe("ACTIVE");
  state.friendsId = friends.id;
  const community = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Waiting Community ${p}`, kind: "COMMUNITY" }),
  )) as Created;
  expect(community.status).toBe("PENDING");
  state.communityId = community.id;

  await loginAs(page, { email: who("guest", testInfo) });
  expect((await profile(page.request, "Gwen", "E2EAA00002")).status()).toBe(200);
  expect((await mutate(page.request, "groups.join", { code: friends.joinCode })).status()).toBe(200);
  expect((await mutate(page.request, "groups.join", { code: community.joinCode })).status()).toBe(200);

  // gifting before the season opens needs the groups opened early (Day 18);
  // no approval for the friends group
  await loginAs(page, { email: who("site", testInfo), adminLevel: "SITE" });
  for (const groupId of [friends.id, community.id]) {
    expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  }

  await loginAs(page, { email: who("guest", testInfo) });
  const picked = await mutate(page.request, "wishlist.requestFromGroup", { groupId: friends.id, count: 1 });
  expect(picked.status(), await picked.text()).toBe(200);
  const waiting = await mutate(page.request, "wishlist.requestFromGroup", { groupId: community.id, count: 1 });
  expect(waiting.status()).toBe(412);
  expect(await errorMessage(waiting)).toMatch(/waiting for approval/);
});

test("the organiser sees the friends group as live", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: who("host", testInfo) });
  await page.goto("/groups");
  await expect(page.getByText("Friends groups go live straight away", { exact: false })).toBeVisible();
  const friends = page.getByRole("listitem").filter({ hasText: state.friendsName });
  await expect(friends.getByText("Live", { exact: true })).toBeVisible();
  const community = page.getByRole("listitem").filter({ hasText: `E2E Waiting Community ${testInfo.project.name}` });
  await expect(community.getByText("Waiting for approval")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a friends group past 15 members is flagged for a site admin, and can still be joined", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const p = testInfo.project.name;
  state.bigName = `E2E Big Friends ${p}`;
  await loginAs(page, { email: who("big-host", testInfo) });
  const big = (await unwrap(
    await mutate(page.request, "groups.create", { name: state.bigName, kind: "FRIENDS" }),
  )) as Created;
  state.bigId = big.id;

  await loginAs(page, { email: who("site", testInfo), adminLevel: "SITE" });
  let check = (await unwrap(await query(page.request, "groups.friendsToCheck"))) as ToCheck;
  expect(check.over).toBe(15);
  expect(check.days).toBe(7);
  // small and new: in the past week's list, not the large one
  expect(check.recent.some((g) => g.id === big.id)).toBe(true);
  expect(check.recent.some((g) => g.id === state.friendsId)).toBe(true);
  expect(check.large.some((g) => g.id === big.id)).toBe(false);
  // communities aren't listed (they're in the queue)
  expect(check.recent.some((g) => g.id === state.communityId)).toBe(false);

  // 15 friends join: 16 members, one past the limit, and joining never stops
  for (let i = 1; i <= 15; i++) {
    await loginAs(page, { email: who(`big-${i}`, testInfo) });
    expect((await mutate(page.request, "groups.join", { code: big.joinCode })).status()).toBe(200);
  }

  await loginAs(page, { email: who("site", testInfo), adminLevel: "SITE" });
  check = (await unwrap(await query(page.request, "groups.friendsToCheck"))) as ToCheck;
  expect(check.large.find((g) => g.id === big.id)?.members).toBe(16);
  expect(check.recent.some((g) => g.id === big.id)).toBe(false);

  const errors = trackPageErrors(page);
  await page.goto("/admin/approvals");
  await expect(page.getByRole("heading", { name: "Friends groups", level: 2 })).toBeVisible();
  const large = page.getByRole("table", { name: "Large friends groups to check" });
  const row = large.getByRole("row").filter({ hasText: state.bigName });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("cell", { name: "16", exact: true })).toBeVisible();
  const recent = page.getByRole("table", { name: /Friends groups started in the last 7 days/ });
  await expect(recent.getByRole("row").filter({ hasText: state.friendsName })).toHaveCount(1);
  await settle(page);
  await snap(page, testInfo, "admin-approvals-friends");

  // closing it uses the usual status control and takes it off the list
  await row.getByRole("button", { name: `Close ${state.bigName}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Close group" }).click();
  // while the dialog closes the page behind it is aria-hidden, so the row
  // "vanishes" before the close is saved: wait for the dialog, then the server
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(large.getByRole("row").filter({ hasText: state.bigName })).toHaveCount(0);
  await expect
    .poll(async () => {
      const closed = (await unwrap(await query(page.request, "groups.friendsToCheck"))) as ToCheck;
      return closed.large.some((g) => g.id === big.id);
    })
    .toBe(false);
  expect(errors).toEqual([]);
});

test("one person can start at most 5 friends groups a season", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("busy", testInfo) });
  for (let i = 1; i <= 5; i++) {
    const res = await mutate(page.request, "groups.create", { name: `E2E Many ${i} ${p}`, kind: "FRIENDS" });
    expect(res.status(), await res.text()).toBe(200);
  }
  const sixth = await mutate(page.request, "groups.create", { name: `E2E Many 6 ${p}`, kind: "FRIENDS" });
  expect(sixth.status()).toBe(400);
  expect(await errorMessage(sixth)).toMatch(/started 5 friends groups this Christmas/);
  // communities aren't part of this limit
  const community = await mutate(page.request, "groups.create", { name: `E2E Many Community ${p}`, kind: "COMMUNITY" });
  expect(community.status()).toBe(200);
});

test("a community linked to its Discord server goes live, and site admins see the server", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  // Discord ids carry their creation time; these are "made" now, unique per
  // project, attempt and server
  const serverId = (n: number) =>
    String(((BigInt(Date.now()) - 1_420_070_400_000n) << 22n) + BigInt((p === "desktop" ? 100 : 200) + testInfo.retry * 10 + n));
  const server = {
    id: serverId(1),
    name: `E2E Tinsel Town ${p}`,
    iconHash: null,
    members: 1234,
    online: 210,
    features: ["COMMUNITY", "PARTNERED"],
    linkedBy: "ADMIN",
  };
  // dev has no Discord sign-in: link as if the organiser picked a server they run
  const link = (groupId: string, s: typeof server | null) =>
    page.request.post("/api/test-auth/discord-link", { headers: testHeaders, data: { groupId, server: s } });

  // the organiser of a community still waiting is told linking puts it live
  await loginAs(page, { email: who("host", testInfo) });
  const errors = trackPageErrors(page);
  await page.goto(`/groups/${state.communityId}/manage`);
  await expect(
    page.getByRole("region", { name: "Discord server" }).getByText(/goes live straight away/),
  ).toBeVisible();

  const name = `E2E Discord Community ${p}`;
  await loginAs(page, { email: who("discord-host", testInfo) });
  const community = (await unwrap(
    await mutate(page.request, "groups.create", { name, kind: "COMMUNITY" }),
  )) as Created;
  expect(community.status).toBe("PENDING");
  const linked = await link(community.id, server);
  expect(linked.status(), await linked.text()).toBe(200);
  expect(await linked.json()).toMatchObject({ status: "ACTIVE", approved: true, discordGuildName: server.name });

  // one a site admin closed stays closed, Discord or not
  const closedName = `E2E Closed Community ${p}`;
  const closed = (await unwrap(
    await mutate(page.request, "groups.create", { name: closedName, kind: "COMMUNITY" }),
  )) as Created;
  await loginAs(page, { email: who("site", testInfo), adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId: closed.id, status: "DISABLED" })).status()).toBe(200);
  const relinked = await link(closed.id, { ...server, id: serverId(2), name: `E2E Closed Server ${p}` });
  expect(await relinked.json()).toMatchObject({ status: "DISABLED", approved: false });

  const check = (await unwrap(await query(page.request, "groups.friendsToCheck"))) as ToCheck;
  expect(check.discord.find((g) => g.id === community.id)?.server).toMatchObject({
    name: server.name,
    members: 1234,
    online: 210,
    features: ["COMMUNITY", "PARTNERED"],
    linkedBy: "ADMIN",
    isNew: true,
  });
  expect(check.discord.some((g) => g.id === closed.id)).toBe(false);

  await page.goto("/admin/approvals");
  await expect(page.getByRole("heading", { name: "Communities on Discord", level: 2 })).toBeVisible();
  const table = page.getByRole("table", { name: /Communities linked to Discord/ });
  const row = table.getByRole("row").filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row.getByText(server.name, { exact: true })).toBeVisible();
  await expect(row.getByText("about 1,234 members · 210 online")).toBeVisible();
  await expect(row.getByText(/linked by an admin/)).toBeVisible();
  await expect(row.getByText("New server: made today")).toBeVisible();
  await expect(row.getByText("Discord Partner")).toBeVisible();
  await expect(row.getByText("Community server")).toBeVisible();
  // the closed one shows its server on its card in the Closed tab
  await page.getByRole("tab", { name: "Closed" }).click();
  const card = page.getByRole("listitem").filter({ hasText: closedName });
  const closedServer = card.getByRole("region", { name: "Discord server" });
  await expect(closedServer.getByText(`E2E Closed Server ${p}`, { exact: true })).toBeVisible();
  await expect(closedServer.getByText("about 1,234 members · 210 online")).toBeVisible();
  await expect(closedServer.getByText(/Checked with Discord/)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-approvals-discord");

  // Admin › Groups names the server too
  await page.goto(`/admin/groups`);
  await expect(page.getByText(`Discord: ${server.name} (about 1,234)`)).toBeVisible();

  // unlinking keeps the community live and forgets the server
  const unlinked = await link(community.id, null);
  expect(await unlinked.json()).toMatchObject({ status: "ACTIVE", approved: false, discordGuildName: null });
  expect(errors).toEqual([]);
});

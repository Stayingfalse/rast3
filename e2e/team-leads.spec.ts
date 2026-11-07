import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, seed, settle, snap, trackPageErrors } from "./helpers";

/**
 * Team leads (owner, 7 Nov). A workplace's organisers (or a site admin)
 * make a colleague lead of their team; the lead looks after just that team
 * from its page: members, an invite that joins people straight into the
 * team, renaming it, a co-lead, and moving someone out of the team (not the
 * workplace). Only organisers take another lead off or move them out.
 * Uses the seed's rival workplace: rival1 organises it, and all three rivals
 * are in "Rival Team".
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

type Team = {
  id: string;
  name: string;
  viewer: { lead: boolean; organiser: boolean };
  members: { userId: string; email: string | null; lead: boolean }[];
};
const state = { rivalDomain: "", orgId: "", teamId: "", ids: {} as Record<string, string> };
const NEW_NAME = "E2E Rival Squad";

test.beforeAll(async ({ request }) => {
  state.rivalDomain = ((await seed(request)) as unknown as { rivalDomain: string }).rivalDomain;
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("a workplace organiser makes a colleague lead of their team", async ({ page }, testInfo) => {
  await loginAs(page, { email: `rival1@${E}` });
  state.orgId = ((await unwrap(await query(page.request, "groups.myOrganisation"))) as { id: string }).id;
  const errors = trackPageErrors(page);

  await page.goto(`/groups/${state.orgId}/manage`);
  await page.getByRole("tab", { name: "Settings" }).click();
  const item = page.getByRole("listitem").filter({ hasText: "Rival Team" });
  await expect(item.getByText(/no lead yet/)).toBeVisible();
  await item.getByRole("link", { name: "Open Rival Team's team page" }).click();
  await expect(page.getByRole("heading", { name: "Rival Team", level: 1 })).toBeVisible();
  state.teamId = page.url().split("/groups/")[1]!.split("/")[0]!;

  const team = (await unwrap(await query(page.request, "groups.team", { teamId: state.teamId }))) as Team;
  for (const m of team.members) state.ids[m.email!.split("@")[0]!] = m.userId;
  expect(Object.keys(state.ids).sort()).toEqual(["rival1", "rival2", "rival3"]);

  const row = page.getByRole("row").filter({ hasText: `rival2@${E}` });
  await row.getByRole("button", { name: /^Actions for / }).click();
  await page.getByRole("menuitem", { name: "Make a team lead" }).click();
  await expect(row.getByText("Team lead", { exact: true })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "team-console");
  expect(errors).toEqual([]);
});

test("the lead finds their team, adds a co-lead, renames it and invites people into it", async ({ page }, testInfo) => {
  await loginAs(page, { email: `rival2@${E}` });
  const errors = trackPageErrors(page);
  await page.goto("/groups");
  await page.getByRole("link", { name: "Manage your team" }).click();
  await expect(page.getByRole("heading", { name: "Rival Team", level: 1 })).toBeVisible();
  await expect(page.getByText(/you lead it/)).toBeVisible();

  const r = page.request;
  const t = { teamId: state.teamId };
  // a co-lead, yes; taking another lead off or moving them out, no (organisers only)
  expect((await mutate(r, "groups.setTeamLead", { ...t, userId: state.ids.rival3, lead: true })).status()).toBe(200);
  expect((await mutate(r, "groups.setTeamLead", { ...t, userId: state.ids.rival3, lead: false })).status()).toBe(403);
  expect((await mutate(r, "groups.removeFromTeam", { ...t, userId: state.ids.rival3 })).status()).toBe(403);
  // nor anything in the workplace itself
  expect((await query(r, "groups.manage", { groupId: state.orgId })).status()).toBe(403);

  await page.getByLabel("Name", { exact: true }).fill(NEW_NAME);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: NEW_NAME, level: 1 })).toBeVisible();

  const message = page.getByLabel("Message");
  await expect(message).toHaveValue(new RegExp(`/${state.rivalDomain.replace(/\./g, "\\.")}\\?team=${state.teamId}`));
  await expect(message).toHaveValue(/you'll be in E2E Rival Squad/);
  await settle(page);
  await snap(page, testInfo, "team-console-lead");
  expect(errors).toEqual([]);
});

test("a co-lead can step down, and then the page is closed to them", async ({ page }) => {
  await loginAs(page, { email: `rival3@${E}` });
  const t = { teamId: state.teamId };
  expect((await mutate(page.request, "groups.setTeamLead", { ...t, userId: state.ids.rival3, lead: false })).status()).toBe(200);
  expect((await query(page.request, "groups.team", t)).status()).toBe(403);
});

test("a colleague joining with the team's link lands in the team", async ({ page }) => {
  await loginAs(page, { email: `teammate@${E}` });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Tess",
    lastName: "Teammate",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2ETEAM0001",
  });
  await page.goto(`/${state.rivalDomain}?team=${state.teamId}`);
  await expect(page.getByText(`You'll join the ${NEW_NAME} team.`)).toBeVisible();

  const joined = (await unwrap(
    await mutate(page.request, "groups.joinOrganisation", {
      workEmail: `teammate@${state.rivalDomain}`,
      teamId: state.teamId,
    }),
  )) as { result: string };
  expect(joined.result).toBe("joined");
  const mine = (await unwrap(await query(page.request, "groups.myOrganisation"))) as { teamId: string | null };
  expect(mine.teamId).toBe(state.teamId);
});

test("only an organiser moves a lead out of the team; they stay in the workplace", async ({ page }) => {
  await loginAs(page, { email: `rival1@${E}` });
  const t = { teamId: state.teamId };
  expect((await mutate(page.request, "groups.removeFromTeam", { ...t, userId: state.ids.rival2 })).status()).toBe(200);
  const team = (await unwrap(await query(page.request, "groups.team", t))) as Team;
  expect(team.members.some((m) => m.userId === state.ids.rival2)).toBe(false);
  expect(team.members.some((m) => m.email === `teammate@${state.rivalDomain}`)).toBe(true);
  // put the name back for anyone else using the seed
  expect((await mutate(page.request, "groups.renameTeam", { ...t, name: "Rival Team" })).status()).toBe(200);

  await loginAs(page, { email: `rival2@${E}` });
  expect((await query(page.request, "groups.team", t)).status()).toBe(403);
  const mine = (await unwrap(await query(page.request, "groups.myOrganisation"))) as { id: string; teamId: string | null };
  expect(mine).toMatchObject({ id: state.orgId, teamId: null });
});

import { expect, test, type APIRequestContext } from "@playwright/test";

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
 * Returning members (owner, 17 Nov): someone who signs in differently from
 * last year gets a new account, and their work email is still on last
 * year's. If that account hasn't been used this season, the work email (with
 * its workplace team) moves to the new one; if it has, they're told how they
 * signed in with it. And the workplace page never leaves them unable to add
 * a wishlist.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const errorMessage = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { error: { json: { message: string } } }).error.json.message;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

type Org = { id: string; workEmail: string | null; teamId: string | null; teams: { id: string; name: string }[] } | null;
const who = (name: string, p: string, retry: number) => `rw-${name}-${p}-${retry}@${E}`;
const state = { domain: "", work: "", teamId: "" };

test.beforeAll(async ({ request }) => {
  state.domain = ((await seed(request)) as unknown as { rivalDomain: string }).rivalDomain;
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("while last year's account is in use this season, a new one is told how to sign in", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  state.work = `pat-${p}-${testInfo.retry}@${state.domain}`;

  // last year: Pat joined with their work email and picked a team
  await loginAs(page, { email: who("old", p, testInfo.retry) });
  const joined = await mutate(page.request, "groups.joinOrganisation", { workEmail: state.work });
  expect(((await unwrap(joined)) as { result: string }).result).toBe("joined");
  const org = (await unwrap(await query(page.request, "groups.myOrganisation"))) as NonNullable<Org>;
  state.teamId = org.teams[0]!.id;
  expect((await mutate(page.request, "groups.setMyTeam", { teamId: state.teamId })).status()).toBe(200);

  // this year, signed in differently: a new account
  await loginAs(page, { email: who("new", p, testInfo.retry) });
  const clash = await mutate(page.request, "groups.joinOrganisation", { workEmail: state.work });
  expect(clash.status()).toBe(409);
  // the old account signed in with an email link: its address, masked
  expect(await errorMessage(clash)).toMatch(/Sign out, then sign in with an email link to r•••@/);
});

test("once it's last year's (not used this season), the work email and team move to the new account", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  // make the old account last season's: not signed in since, not checked in
  const back = await page.request.post("/api/test-auth/reminders", {
    headers: testHeaders,
    data: { run: false, backdate: [who("old", p, testInfo.retry)] },
  });
  expect(back.status()).toBe(200);

  await loginAs(page, { email: who("new", p, testInfo.retry) });
  const joined = await mutate(page.request, "groups.joinOrganisation", { workEmail: state.work });
  expect(joined.status(), await joined.text()).toBe(200);
  expect(((await unwrap(joined)) as { result: string }).result).toBe("joined");
  const mine = (await unwrap(await query(page.request, "groups.myOrganisation"))) as NonNullable<Org>;
  expect(mine).toMatchObject({ workEmail: state.work, teamId: state.teamId });

  // last year's account is no longer in the workplace
  await loginAs(page, { email: who("old", p, testInfo.retry) });
  expect(await unwrap(await query(page.request, "groups.myOrganisation"))).toBeNull();
});

test("if joining fails on the workplace page, they can still add their wishlist", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  // the work email is on an account used this season (the new one, above)
  await loginAs(page, { email: who("third", p, testInfo.retry) });
  const errors = trackPageErrors(page);
  await page.goto(`/${state.domain}`);
  await page.getByLabel(`Your @${state.domain} email`).fill(state.work);
  await page.getByRole("button", { name: /^Join / }).click();
  await expect(page.getByText(/already on another account this Christmas/)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "workplace-join-clash");
  await page.getByRole("button", { name: "Add your wishlist anyway" }).click();
  await expect(page.getByText("Nearly there: your name and your Amazon wishlist.")).toBeVisible();
  expect(errors).toEqual([]);
});

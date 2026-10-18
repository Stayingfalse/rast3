import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, hasTestLogin, loginAs, seed } from "./helpers";

/**
 * Day 9 tenant isolation: who people can give to, read and manage is decided
 * by group membership. The seed has two approved organisations (the main
 * e2e org and a rival) and one member whose organisation awaits approval.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = "e2e.raosanta.test";
// Rival members' wishlists are seeded as …/ls/E2E000901 to E2E000903
const RIVAL_LIST = /E2E00090\d$/;

type Json = Record<string, unknown>;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data
    .json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(
    `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`,
  );
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

const myListUrls = async (r: APIRequestContext) => {
  const rows = (await unwrap(await query(r, "wishlist.getMyAssignments"))) as {
    wishlistOwner: { amazonWishlistUrl: string };
  }[];
  return rows.map((a) => a.wishlistOwner.amazonWishlistUrl);
};
const feedMessages = async (r: APIRequestContext, scope: string) => {
  const feed = (await unwrap(
    await query(r, "kudos.getFeed", { scope, limit: 50 }),
  )) as { items: { message: string }[] };
  return feed.items.map((k) => k.message);
};

let rivalKudos = "";

test.beforeAll(async ({ request }) => {
  const summary = (await seed(request)) as unknown as Json;
  rivalKudos = summary.rivalKudos as string;
  expect(rivalKudos).toBeTruthy();
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("hand-outs stay in the organisation until you ask for strangers", async ({
  page,
}) => {
  await loginAs(page, { email: `giver@${E}` });
  const r = page.request;

  expect((await mutate(r, "wishlist.requestInitialAssignments")).status()).toBe(200);
  expect(
    (await mutate(r, "wishlist.requestCrossDepartmentAssignments", { count: 3 })).status(),
  ).toBe(200);
  const own = await myListUrls(r);
  expect(own.length).toBeGreaterThanOrEqual(4);
  expect(own.filter((u) => RIVAL_LIST.test(u))).toEqual([]);

  // Strangers come only from another approved organisation
  expect(
    (await mutate(r, "wishlist.requestCrossDomainAssignments", { count: 3 })).status(),
  ).toBe(200);
  const strangers = (await myListUrls(r)).filter((u) => !own.includes(u));
  expect(strangers.length).toBeGreaterThan(0);
  for (const url of strangers) {
    // never the pending organisation's member (…/ls/E2E000950)
    expect(url).not.toMatch(/E2E000950$/);
  }
});

test("team and organisation feeds only show your own organisation", async ({
  page,
}) => {
  await loginAs(page, { email: `giver@${E}` });
  for (const scope of ["department", "domain"]) {
    expect(await feedMessages(page.request, scope)).not.toContain(rivalKudos);
  }

  await loginAs(page, { email: `rival2@${E}` });
  const rivalFeed = await feedMessages(page.request, "domain");
  expect(rivalFeed).toContain(rivalKudos);
  expect(rivalFeed.every((m) => m === rivalKudos)).toBe(true);
});

test("an organisation's organiser only manages their own members", async ({
  page,
}) => {
  await loginAs(page, { email: `giver@${E}` });
  const giverProfile = (await unwrap(
    await query(page.request, "profile.getCurrentProfile"),
  )) as { id: string };

  await loginAs(page, { email: `rival1@${E}`, adminLevel: "DOMAIN" });
  const r = page.request;
  const users = (await unwrap(await query(r, "user.getAll"))) as {
    email: string;
  }[];
  expect(users.length).toBeGreaterThan(0);
  expect(users.every((u) => /^rival\d@/.test(u.email))).toBe(true);

  expect(
    (
      await mutate(r, "user.toggleProfileCompletion", {
        userId: giverProfile.id,
        completed: false,
      })
    ).status(),
  ).toBe(403);
});

test("members of an organisation awaiting approval can't pick up lists", async ({
  page,
}) => {
  await loginAs(page, { email: `pending@${E}` });
  const res = await mutate(
    page.request,
    "wishlist.requestCrossDomainAssignments",
    { count: 1 },
  );
  expect(res.status()).toBe(412);
  const allowed = await page.request.get("/api/kudos/allowed");
  expect(await allowed.json()).toEqual({ allowed: false });
});

import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, testHeaders } from "./helpers";

/**
 * Day 24: while gifting is open, people who have picked up a list this
 * season hear (at most weekly) about new members' wishlists that haven't
 * had a gift yet. Lists they hold, or that have had a gift, don't count.
 * Test addresses are never emailed, so the log records each as skipped.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

type Log = { kind: string; status: string; note: string | null; ref: string; email: string };
const DAY = 24 * 3600_000;
const who = (name: string, p: string) => `nl-${name}-${p}@${E}`;
let groupId = "";
let code = "";

/** runs the reminders (at a pretend time, if given) and returns this run's new-lists emails */
const newListsEmails = async (r: APIRequestContext, p: string, now?: number) => {
  const res = await r.post("/api/test-auth/reminders", {
    headers: testHeaders,
    data: now ? { now: new Date(now).toISOString() } : {},
  });
  expect(res.status()).toBe(200);
  const { log } = (await res.json()) as { log: Log[] };
  return log
    .filter((l) => l.kind === "NEW_LISTS" && l.email.startsWith("nl-") && l.email.endsWith(`-${p}@${E}`))
    .map((l) => [l.email, l.status, l.note]);
};

const join = async (r: APIRequestContext, name: string, p: string) => {
  await mutate(r, "profile.saveProfile", {
    firstName: name,
    lastName: "Newlist",
    amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/E2ENL${name.toUpperCase()}${p.length}`,
  });
  expect((await mutate(r, "groups.join", { code })).status()).toBe(200);
};
const pickUpAndGift = async (r: APIRequestContext, gift: boolean) => {
  expect((await mutate(r, "wishlist.requestFromGroup", { groupId, count: 1 })).status()).toBe(200);
  if (!gift) return;
  const held = (await unwrap(
    await r.get(
      `/api/trpc/wishlist.getMyAssignments?input=${encodeURIComponent(JSON.stringify({ json: { groupId } }))}`,
    ),
  )) as { id: string; purchases: unknown }[];
  const fresh = held.find((a) => !a.purchases)!;
  expect((await mutate(r, "wishlist.markPurchase", { assignmentId: fresh.id })).status()).toBe(200);
};

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: Santa runs a friends group, open for gifting, and picks up Fern's list", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("santa", p) });
  await mutate(page.request, "profile.saveProfile", {
    firstName: "Santa",
    lastName: "Newlist",
    amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/E2ENLSANTA${p.length}`,
  });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E New Lists ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  code = g.joinCode;

  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  expect(
    (await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })).status(),
  ).toBe(200);

  await loginAs(page, { email: who("fern", p) });
  await join(page.request, "Fern", p);
  await loginAs(page, { email: who("santa", p) });
  await pickUpAndGift(page.request, false);

  // Fern's is the only new list, and Santa holds it; Fern isn't gifting
  expect(await newListsEmails(page.request, p)).toEqual([]);
});

test("lists already gifted or held don't count; a new member's list does", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  // Gus joins and Santa gifts his list straight away
  await loginAs(page, { email: who("gus", p) });
  await join(page.request, "Gus", p);
  await loginAs(page, { email: who("santa", p) });
  await pickUpAndGift(page.request, true);
  expect(await newListsEmails(page.request, p)).toEqual([]);

  // Fern starts gifting: she's handed Santa's list (Gus's has had a gift)
  await loginAs(page, { email: who("fern", p) });
  await pickUpAndGift(page.request, false);
  expect(await newListsEmails(page.request, p)).toEqual([]);

  // Nova joins: both Santas hear about her list, once
  await loginAs(page, { email: who("nova", p) });
  await join(page.request, "Nova", p);
  const sent = await newListsEmails(page.request, p);
  expect(sent.map(([email]) => email).sort()).toEqual([who("fern", p), who("santa", p)].sort());
  expect(sent.every(([, status, note]) => status === "SKIPPED" && note === "test address")).toBe(true);
  expect(await newListsEmails(page.request, p)).toHaveLength(2);
});

test("a week later, nothing new means no email", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("santa", p) });
  expect(await newListsEmails(page.request, p, Date.now() + 8 * DAY)).toHaveLength(2);
});

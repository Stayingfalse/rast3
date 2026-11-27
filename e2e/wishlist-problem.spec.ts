import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, testHeaders } from "./helpers";

/**
 * Two or more Santas report a problem with a wishlist (owner, 27 Nov): its
 * owner gets one email, so they don't miss out. One Santa, even reporting
 * twice, isn't enough; the same problem never emails twice.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(`/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`);
const who = (name: string, p: string) => `wp-${name}-${p}@${E}`;
const list = (n: string) => `https://www.amazon.co.uk/hz/wishlist/ls/E2EWPR000${n}`;

type Log = { kind: string; status: string; email: string };
const problemEmails = async (r: APIRequestContext, p: string) => {
  const res = await r.post("/api/test-auth/reminders", { headers: testHeaders, data: {} });
  expect(res.status()).toBe(200);
  const { log } = (await res.json()) as { log: Log[] };
  return log.filter((l) => l.kind === "WISHLIST_PROBLEM" && l.email === who("owner", p));
};

let groupId = "";
let joinCode = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

/** Picks up wishlists in the group and returns the owner's, by its link. */
async function ownersParcel(r: APIRequestContext) {
  expect((await mutate(r, "wishlist.requestFromGroup", { groupId, count: 2 })).status()).toBe(200);
  const parcels = (await unwrap(await query(r, "wishlist.getMyAssignments", { groupId }))) as {
    id: string;
    link: string | null;
  }[];
  const a = parcels.find((x) => x.link?.includes("E2EWPR0001"));
  expect(a, JSON.stringify(parcels)).toBeTruthy();
  return a!.id;
}
const report = (r: APIRequestContext, assignmentId: string) =>
  mutate(r, "wishlist.reportIssue", { assignmentId, reportType: "NO_ADDRESS" });

test("set up: an owner and two Santas in a friends group", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("owner", p) });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Owen", lastName: "Owner", amazonWishlistUrl: list("1") });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Problems ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  joinCode = g.joinCode;
  for (const [name, n] of [["s1", "2"], ["s2", "3"]] as const) {
    await loginAs(page, { email: who(name, p) });
    await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Sam", lastName: name, amazonWishlistUrl: list(n) });
    expect((await mutate(page.request, "groups.join", { code: joinCode })).status()).toBe(200);
  }
  await loginAs(page, { email: `wp-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })).status()).toBe(200);
});

test("one Santa reporting, even twice, sends nothing", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("s1", p) });
  const a = await ownersParcel(page.request);
  expect((await report(page.request, a)).status()).toBe(200);
  expect((await report(page.request, a)).status()).toBe(200);
  expect(await problemEmails(page.request, p)).toEqual([]);
});

test("a second Santa's report emails the owner, once", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("s2", p) });
  const a = await ownersParcel(page.request);
  expect((await report(page.request, a)).status()).toBe(200);
  // (test addresses are logged, not sent)
  const first = await problemEmails(page.request, p);
  expect(first).toHaveLength(1);
  expect(first[0]).toMatchObject({ kind: "WISHLIST_PROBLEM", status: "SKIPPED" });
  // and not again for the same problem
  expect(await problemEmails(page.request, p)).toHaveLength(1);
});

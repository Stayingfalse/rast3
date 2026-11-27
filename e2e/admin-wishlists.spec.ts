import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, trackPageErrors } from "./helpers";

/**
 * Admin › Wishlists (owner, 27 Nov): everyone once, with every group they're
 * in, filterable by any group (not just workplaces), with problems in place.
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
const who = (name: string, p: string) => `aw-${name}-${p}@${E}`;
type Rows = { rows: { name: string; groups: { name: string }[]; problems: { type: string }[]; pickedUp: number }[] };

let groupA = "";
let groupB = "";
let names: [string, string] = ["", ""];

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: one person in two friends groups, a Santa reports a problem", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  names = [`E2E Wishlists A ${p}`, `E2E Wishlists B ${p}`];
  await loginAs(page, { email: who("owner", p) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Willa",
    lastName: `Wish ${p}`,
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EAWL0001",
  });
  const a = (await unwrap(await mutate(page.request, "groups.create", { name: names[0], kind: "FRIENDS" }))) as {
    id: string;
    joinCode: string;
  };
  const b = (await unwrap(await mutate(page.request, "groups.create", { name: names[1], kind: "FRIENDS" }))) as {
    id: string;
  };
  groupA = a.id;
  groupB = b.id;

  await loginAs(page, { email: `aw-site-${p}@${E}`, adminLevel: "SITE" });
  for (const g of [groupA, groupB]) {
    expect((await mutate(page.request, "groups.setStatus", { groupId: g, status: "ACTIVE" })).status()).toBe(200);
  }
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId: groupA, open: true })).status()).toBe(200);

  await loginAs(page, { email: who("santa", p) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Sid",
    lastName: "Santa",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EAWL0002",
  });
  expect((await mutate(page.request, "groups.join", { code: a.joinCode })).status()).toBe(200);
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId: groupA, count: 1 })).status()).toBe(200);
  const [parcel] = (await unwrap(await query(page.request, "wishlist.getMyAssignments", { groupId: groupA }))) as {
    id: string;
  }[];
  expect(
    (await mutate(page.request, "wishlist.reportIssue", { assignmentId: parcel!.id, reportType: "DOESNT_EXIST" })).status(),
  ).toBe(200);
});

test("one row per person, with every group, filterable by any group", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `aw-site-${p}@${E}`, adminLevel: "SITE" });
  const list = async (input: object) =>
    ((await unwrap(await query(page.request, "admin.wishlists", { q: who("owner", p), ...input }))) as Rows).rows;

  const all = await list({});
  expect(all).toHaveLength(1);
  expect(all[0]!.groups.map((g) => g.name).sort()).toEqual([...names].sort());
  expect(all[0]!.pickedUp).toBe(1);
  expect(all[0]!.problems.map((x) => x.type)).toEqual(["DOESNT_EXIST"]);
  // either group finds them, once
  expect(await list({ groupId: groupB })).toHaveLength(1);
  expect(await list({ groupId: groupA })).toHaveLength(1);
  expect(await list({ show: "problems" })).toHaveLength(1);
  expect(await list({ show: "notCheckedIn" })).toHaveLength(0);

  // the page
  const errors = trackPageErrors(page);
  await page.goto("/admin/links");
  await expect(page.getByRole("heading", { name: "Wishlists" })).toBeVisible();
  await page.getByLabel("Search").fill(who("owner", p));
  const row = page.getByRole("row").filter({ hasText: `Willa Wish ${p}` });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("list", { name: `Willa Wish ${p}'s groups` }).getByRole("listitem")).toHaveCount(2);
  await expect(row.getByText("Link doesn't work")).toBeVisible();
  await expect(row.getByText("Checked in")).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-wishlists");
  await row.getByRole("button", { name: `Actions for Willa Wish ${p}` }).click();
  await expect(page.getByRole("menuitem", { name: "Email about the problems" })).toHaveAttribute(
    "href",
    /^mailto:aw-owner-/,
  );
  expect(errors).toEqual([]);
});

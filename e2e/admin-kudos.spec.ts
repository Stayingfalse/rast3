import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, trackPageErrors } from "./helpers";

/**
 * Admin › Kudos (owner, 27 Nov): every thank-you, searchable and filterable by
 * any group, with hide, show again and a confirmed delete.
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
const who = (name: string, p: string) => `ak-${name}-${p}@${E}`;
type Kudos = { total: number; rows: { id: string; message: string; hidden: boolean; group: { name: string } | null }[] };

let groupId = "";
let groupName = "";
let message = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: a gift in a friends group and its thank-you", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Kudos ${p}`;
  message = `Thank you, mystery Santa! (${p} ${Date.now().toString(36)})`;
  await loginAs(page, { email: who("owner", p) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Kit",
    lastName: "Kudos",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EAKD0001",
  });
  const g = (await unwrap(await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }))) as {
    id: string;
    joinCode: string;
  };
  groupId = g.id;

  await loginAs(page, { email: `ak-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);

  await loginAs(page, { email: who("santa", p) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Sol",
    lastName: "Santa",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EAKD0002",
  });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 1 })).status()).toBe(200);
  const [parcel] = (await unwrap(await query(page.request, "wishlist.getMyAssignments", { groupId }))) as { id: string }[];
  expect((await mutate(page.request, "wishlist.markPurchase", { assignmentId: parcel!.id })).status()).toBe(200);

  await loginAs(page, { email: who("owner", p) });
  const [gift] = (await unwrap(await query(page.request, "wishlist.giftsToMe"))) as { id: string }[];
  expect(
    (await mutate(page.request, "kudos.createKudos", { message, purchaseId: gift!.id, images: [] })).status(),
  ).toBe(200);
});

test("admins find it by search or group, hide it, show it, delete it", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `ak-site-${p}@${E}`, adminLevel: "SITE" });
  const list = async (input: object) => (await unwrap(await query(page.request, "admin.kudos", input))) as Kudos;
  const found = await list({ q: message });
  expect(found.rows).toHaveLength(1);
  expect(found.rows[0]!.group?.name).toBe(groupName);
  expect((await list({ groupId })).rows.map((r) => r.message)).toContain(message);

  const errors = trackPageErrors(page);
  await page.goto("/admin/kudos");
  await expect(page.getByRole("heading", { name: "Kudos" })).toBeVisible();
  await page.getByLabel("Search").fill(message);
  const row = page.getByRole("row").filter({ hasText: message });
  await expect(row).toHaveCount(1);
  await expect(row.getByText(groupName)).toBeVisible();
  await expect(row.getByText("Visible", { exact: true })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-kudos");

  await row.getByRole("button", { name: "Actions for Kit Kudos's thank-you" }).click();
  await page.getByRole("menuitem", { name: "Hide from the feeds" }).click();
  await expect(row.getByText("Hidden", { exact: true })).toBeVisible();
  expect((await list({ q: message, show: "hidden" })).rows).toHaveLength(1);
  await row.getByRole("button", { name: "Actions for Kit Kudos's thank-you" }).click();
  await page.getByRole("menuitem", { name: "Show again" }).click();
  await expect(row.getByText("Visible", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Actions for Kit Kudos's thank-you" }).click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete this thank-you?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No thank-yous match.")).toBeVisible();
  expect((await list({ q: message })).total).toBe(0);
  expect(errors).toEqual([]);
});

test("only site admins can list them", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("owner", testInfo.project.name) });
  expect((await query(page.request, "admin.kudos", {})).status()).toBe(403);
});

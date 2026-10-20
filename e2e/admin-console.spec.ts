import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/** Day 17: the site admin console (overview, groups, people). */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(
    `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`,
  );
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

type People = { total: number; users: { id: string; email: string; adminLevel: string }[] };
const findPerson = async (r: APIRequestContext, email: string) =>
  ((await unwrap(await query(r, "admin.users", { q: email }))) as People).users.find(
    (u) => u.email === email,
  );

let name = "";
const site = (p: string) => `siteadmin-${p}@${E}`;

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: a friends group with two people", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  name = `E2E Admin Check ${p}`;
  await loginAs(page, { email: `ac-host-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", { firstName: "Ada", lastName: "Host" });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name, kind: "FRIENDS" }),
  )) as { joinCode: string };
  await loginAs(page, { email: `ac-guest-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", { firstName: "Gil", lastName: "Guest" });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
});

test("overview shows what needs attention and health", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: site(testInfo.project.name), name: "Sita Admin", adminLevel: "SITE" });
  await page.goto("/admin");
  await expect(page.getByText("Needs you")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review approvals" })).toBeVisible();
  await expect(page.getByText("Connected")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Site admin" })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-overview");
  expect(errors).toEqual([]);
});

test("groups table finds a group and opens its console", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: site(testInfo.project.name), adminLevel: "SITE" });
  await page.goto("/admin/groups");
  await page.getByLabel("Search").fill(name);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Friends group");
  await settle(page);
  await snap(page, testInfo, "admin-groups");
  await row.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Open console" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("people: make and remove a site admin, delete an account", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await loginAs(page, { email: site(p), adminLevel: "SITE" });
  await page.goto("/admin/users");
  await page.getByLabel("Search").fill(`ac-host-${p}@`);
  const host = page.getByRole("row").filter({ hasText: `ac-host-${p}@` });
  await expect(host).toHaveCount(1);
  await expect(host).toContainText(name);
  await settle(page);
  await snap(page, testInfo, "admin-people");

  await host.getByRole("button", { name: /^Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Make a site admin" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Make site admin" }).click();
  await expect(host.getByText("Site admin")).toBeVisible();
  expect((await findPerson(page.request, `ac-host-${p}@${E}`))?.adminLevel).toBe("SITE");

  const hostId = (await findPerson(page.request, `ac-host-${p}@${E}`))!.id;
  expect(
    (await mutate(page.request, "admin.setSiteAdmin", { userId: hostId, siteAdmin: false })).status(),
  ).toBe(200);
  expect((await findPerson(page.request, `ac-host-${p}@${E}`))?.adminLevel).toBe("USER");

  // you can't change or delete yourself
  const me = (await findPerson(page.request, site(p)))!.id;
  expect(
    (await mutate(page.request, "admin.setSiteAdmin", { userId: me, siteAdmin: false })).status(),
  ).toBe(403);
  expect((await mutate(page.request, "admin.deleteUser", { userId: me })).status()).toBe(403);

  await page.getByLabel("Search").fill(`ac-guest-${p}@`);
  const guest = page.getByRole("row").filter({ hasText: `ac-guest-${p}@` });
  await expect(guest).toHaveCount(1);
  await guest.getByRole("button", { name: /^Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Delete account" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete account" }).click();
  await expect(page.getByText("Nobody matches.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("only site admins get in", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `ac-plain-${p}@${E}`, adminLevel: "USER" });
  expect((await query(page.request, "admin.overview")).status()).toBe(403);
  expect((await query(page.request, "admin.users", { q: "" })).status()).toBe(403);
  expect((await page.goto("/admin/groups"))?.status()).toBe(404);

  // an organiser of a friends group is sent to their own console instead
  await loginAs(page, { email: `ac-host-${p}@${E}` });
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/groups\/[^/]+\/manage$/);
  expect((await query(page.request, "admin.groups", {})).status()).toBe(403);
});

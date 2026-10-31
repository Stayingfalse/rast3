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

/** Day 16: the organiser console and "Bring your team". */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

let groupId = "";
let code = "";
let name = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: a group with an organiser and a friend", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  name = `E2E Supper Club ${p}`;
  await loginAs(page, { email: `host-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Hana", lastName: "Host" });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  code = g.joinCode;
  await loginAs(page, { email: `guest-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", { over16: true, firstName: "Gus", lastName: "Guest" });
  expect((await mutate(page.request, "groups.join", { code })).status()).toBe(200);
  // approved, so the only thing hiding emails is that it's a friends group
  await loginAs(page, { email: `console-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
});

test("the organiser manages members", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `host-${testInfo.project.name}@${E}` });
  await page.goto("/groups");
  await page
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("link", { name: "Manage group" })
    .click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

  const guest = page.getByRole("row").filter({ hasText: "Gus Guest" });
  await expect(guest.getByText("New")).toBeVisible();
  // friends groups never show members' emails (owner, 26 Oct)
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);
  await expect(page.getByText(`guest-${testInfo.project.name}@`)).toHaveCount(0);
  await settle(page);
  await snap(page, testInfo, "console-members");

  await guest.getByRole("button", { name: "Actions for Gus Guest" }).click();
  await page.getByRole("menuitem", { name: "Make an organiser" }).click();
  await expect(guest.getByText("Organiser")).toBeVisible();

  await guest.getByRole("button", { name: "Actions for Gus Guest" }).click();
  await page.getByRole("menuitem", { name: "Remove from group" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Gus Guest" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("bring your team: invite message and printable poster", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `host-${testInfo.project.name}@${E}` });
  await page.goto(`/groups/${groupId}/manage`);
  await page.getByRole("tab", { name: "Bring your team" }).click();
  await expect(page.getByLabel("Message")).toHaveValue(new RegExp(`/join/${code}`));
  await settle(page);
  await snap(page, testInfo, "console-invite");

  await page.goto(`/groups/${groupId}/poster`);
  await expect(page.getByRole("img", { name: /QR code for .*\/join\// })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "console-poster");
  expect(errors).toEqual([]);
});

test("non-organisers can't open the console or poster", async ({ page }, testInfo) => {
  await loginAs(page, { email: `guest-${testInfo.project.name}@${E}` });
  expect((await page.goto(`/groups/${groupId}/poster`))?.status()).toBe(404);
  const res = await page.request.get(
    `/api/trpc/groups.manage?input=${encodeURIComponent(JSON.stringify({ json: { groupId } }))}`,
  );
  expect(res.status()).toBe(403);
});

test("community organisers don't see members' emails either (owner, 27 Oct)", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `host-${p}@${E}` });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Community ${p}`, kind: "COMMUNITY" }),
  )) as { id: string; joinCode: string };
  await loginAs(page, { email: `guest-${p}@${E}` });
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  await loginAs(page, { email: `console-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId: g.id, status: "ACTIVE" })).status()).toBe(200);

  await loginAs(page, { email: `host-${p}@${E}` });
  const res = await page.request.get(
    `/api/trpc/groups.manage?input=${encodeURIComponent(JSON.stringify({ json: { groupId: g.id } }))}`,
  );
  expect(res.status()).toBe(200);
  const { members } = (await unwrap(res)) as { members: { email: string | null }[] };
  expect(members).toHaveLength(2);
  expect(members.every((m) => m.email === null)).toBe(true);
});

import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/** Day 16: the organiser console and "Bring your team". */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = "e2e.raosanta.test";
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
  await mutate(page.request, "profile.saveProfile", { firstName: "Hana", lastName: "Host" });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  code = g.joinCode;
  await loginAs(page, { email: `guest-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", { firstName: "Gus", lastName: "Guest" });
  expect((await mutate(page.request, "groups.join", { code })).status()).toBe(200);
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

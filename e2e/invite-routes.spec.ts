import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, trackPageErrors } from "./helpers";

/**
 * Invite routes (owner, 23 Oct 2026). A workplace has its own memorable link,
 * raosanta.uk/<domain>: the work email (and join code, when the organisation
 * asks for one) comes first, then sign-in and the profile. Friends invites
 * join straight from the code (see groups.spec).
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

let domain = "";
let orgId = "";
let code = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: an approved workplace that asks for a join code", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  domain = `inv-${p}.${E}`;
  await loginAs(page, { email: `inv-boss-${p}@${E}` });
  expect(
    (await mutate(page.request, "groups.startOrganisation", { workEmail: `boss@${domain}` })).status(),
  ).toBe(200);
  const mine = (await unwrap(await query(page.request, "groups.myOrganisation"))) as { id: string } | null;
  orgId = mine!.id;
  expect((await mutate(page.request, "groups.setOrgCode", { groupId: orgId, enabled: true })).status()).toBe(200);
  code = ((await unwrap(await query(page.request, "groups.manage", { groupId: orgId }))) as { joinCode: string })
    .joinCode;
  expect(code).toHaveLength(8);

  await loginAs(page, { email: `inv-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId: orgId, status: "ACTIVE" })).status()).toBe(200);
});

test("a workplace's own link asks for the work email first", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await page.goto(`/${domain}`);
  await expect(page.getByRole("heading", { name: domain })).toBeVisible();
  await expect(page.getByLabel(`Your @${domain} email`)).toBeVisible();
  await expect(page.getByLabel("Join code")).toBeVisible();
  // a personal address isn't accepted
  await page.getByLabel(`Your @${domain} email`).fill("someone@gmail.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(`Use your @${domain} email address`)).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "invite-workplace");
  // anything that isn't a workplace's domain is the usual 404
  expect((await page.goto("/not-a-workplace.example.test"))?.status()).toBe(404);
  expect(errors).toEqual([]);
});

test("a colleague joins from the link with its code, then fills in their profile", async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await loginAs(page, { email: `inv-colleague-${p}@${E}` });

  // a wrong code is refused
  await page.goto(`/${domain}`);
  await page.getByLabel(`Your @${domain} email`).fill(`cole@${domain}`);
  await page.getByLabel("Join code").fill("WRONGCOD");
  await page.getByRole("button", { name: `Join ${domain}` }).click();
  await expect(page.getByText("That join code isn't right")).toBeVisible();

  // the organiser's link carries the code
  await page.goto(`/${domain}?code=${code}`);
  await expect(page.getByLabel("Join code")).toHaveValue(code);
  await page.getByLabel(`Your @${domain} email`).fill(`cole@${domain}`);
  await page.getByRole("button", { name: `Join ${domain}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Complete Your Profile" })).toBeVisible();
  await dialog.getByLabel("First name").fill("Cole");
  await dialog.getByLabel("Last name").fill("League");
  await dialog.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(`You're in ${domain}.`)).toBeVisible();

  const me = (await unwrap(await query(page.request, "profile.getCurrentProfile"))) as {
    workEmail: string | null;
    workplace: { id: string } | null;
  };
  expect(me.workplace?.id).toBe(orgId);
  expect(me.workEmail).toBe(`cole@${domain}`);
  expect(errors).toEqual([]);
});

test("the organiser's invite message uses the workplace's own link", async ({ page }, testInfo) => {
  await loginAs(page, { email: `inv-boss-${testInfo.project.name}@${E}` });
  await page.goto(`/groups/${orgId}/manage`);
  await page.getByRole("tab", { name: "Bring your team" }).click();
  await expect(page.getByLabel("Message")).toHaveValue(new RegExp(`/${domain.replace(/\./g, "\\.")} \\(join code`));
});

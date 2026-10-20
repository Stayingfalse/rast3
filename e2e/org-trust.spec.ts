import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  hasTestLogin,
  loginAs,
  seed,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/**
 * Day 11: organisations are joined on trust (no email verification), with an
 * optional join code, organisers seeing and removing recent joiners, and
 * new organisations waiting for a site admin.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = "e2e.raosanta.test";
const RIVAL = `rival.${E}`;

const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data
    .json;
const query = (r: APIRequestContext, path: string, input?: unknown) =>
  r.get(
    `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`,
  );
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

const joinOrg = (r: APIRequestContext, workEmail: string, joinCode?: string) =>
  mutate(r, "groups.joinOrganisation", { workEmail, ...(joinCode ? { joinCode } : {}) });

let code = "";

test.beforeAll(async ({ request }) => {
  await seed(request);
});

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("an organiser can require a join code", async ({ page }) => {
  await loginAs(page, { email: `rival1@${E}`, adminLevel: "DOMAIN" });
  const orgs = (await unwrap(await query(page.request, "groups.myOrgs"))) as {
    id: string;
    name: string;
  }[];
  const org = orgs.find((o) => o.name === RIVAL);
  expect(org).toBeTruthy();
  const res = await mutate(page.request, "groups.setOrgCode", {
    groupId: org!.id,
    enabled: true,
  });
  expect(res.status()).toBe(200);
  code = ((await unwrap(res)) as { joinCode: string }).joinCode;
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
});

test("joining that organisation needs the code", async ({ page }, testInfo) => {
  const email = `newbie-${testInfo.project.name}@${E}`;
  await loginAs(page, { email });
  const work = `newbie-${testInfo.project.name}@${RIVAL}`;
  const without = (await unwrap(await joinOrg(page.request, work))) as { result: string };
  expect(without.result).toBe("needsCode");
  const wrong = (await unwrap(await joinOrg(page.request, work, "AAAA-AAAA"))) as { result: string };
  expect(wrong.result).toBe("wrongCode");
  const withCode = (await unwrap(
    await joinOrg(page.request, work, `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`),
  )) as { result: string };
  expect(withCode.result).toBe("joined");
});

test("organisers see recent joiners and can remove them", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: `rival1@${E}`, adminLevel: "DOMAIN" });
  const joiners = (await unwrap(await query(page.request, "user.recentJoiners"))) as {
    userId: string;
    email: string;
  }[];
  const newbie = joiners.find((j) => j.email.startsWith(`newbie-${testInfo.project.name}@`));
  expect(newbie).toBeTruthy();

  // organisers who open /admin land on their own console (Day 17)
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/groups\/[^/]+\/manage$/);
  await expect(page.getByRole("cell", { name: newbie!.email })).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-org-trust");

  const res = await mutate(page.request, "user.removeFromOrganisation", {
    userId: newbie!.userId,
  });
  expect(res.status()).toBe(200);
  const after = (await unwrap(await query(page.request, "user.recentJoiners"))) as {
    userId: string;
  }[];
  expect(after.some((j) => j.userId === newbie!.userId)).toBe(false);
  expect(errors).toEqual([]);
});

test("a new organisation waits for a site admin", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const domain = `brandnew-${testInfo.project.name}.${E}`;
  await loginAs(page, { email: `founder-${testInfo.project.name}@${E}` });
  const setup = await mutate(page.request, "groups.startOrganisation", {
    workEmail: `fay@${domain}`,
  });
  expect(setup.status()).toBe(200);
  // can't pick up lists until approved
  const early = await mutate(page.request, "wishlist.requestCrossDomainAssignments", { count: 1 });
  expect(early.status()).toBe(412);

  await loginAs(page, { email: `site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  await page.goto("/admin/approvals");
  const card = page.getByRole("listitem").filter({ hasText: domain });
  await expect(card).toBeVisible();
  await settle(page);
  await snap(page, testInfo, "admin-approvals");
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toHaveCount(0);

  const live = (await unwrap(
    await query(page.request, "groups.forReview", { status: "ACTIVE" }),
  )) as { name: string }[];
  expect(live.some((g) => g.name === domain)).toBe(true);
  expect(errors).toEqual([]);
});

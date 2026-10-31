import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, seed, settle } from "./helpers";

/**
 * Day 28: accessibility and mobile. Every main page, signed out and in, at
 * desktop and Pixel 7 widths, checked with axe against WCAG 2.2 A/AA (which
 * includes 24px touch targets), and for sideways scrolling. Serious and
 * critical problems fail the run; everything found is written to
 * test-results/a11y/<project>.json for the record.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, p: string, input?: unknown) =>
  r.post(`/api/trpc/${p}`, { data: { json: input ?? null } });

type Finding = { page: string; id: string; impact: string | null; help: string; nodes: string[] };
const findings: Finding[] = [];
let groupId = "";
let joinCode = "";
let domain = "";

async function audit(page: Page, name: string) {
  await settle(page);
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = r.violations.map((v) => ({
    page: name,
    id: v.id,
    impact: v.impact ?? null,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
  }));
  // mobile pass: the page itself never scrolls sideways (wide tables scroll
  // inside their own box)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) {
    found.push({ page: name, id: "page-scrolls-sideways", impact: "serious", help: `${overflow}px wider than the screen`, nodes: [] });
  }
  findings.push(...found);
  const blocking = found.filter((f) => f.impact === "serious" || f.impact === "critical");
  expect
    .soft(blocking, `${name}: ${blocking.map((b) => `${b.id} (${b.nodes.join(", ")})`).join("; ")}`)
    .toEqual([]);
}

async function visit(page: Page, url: string, name = url) {
  const res = await page.goto(url);
  expect(res?.status(), url).toBeLessThan(500);
  await audit(page, name);
}

test.beforeAll(async ({ request }) => {
  domain = ((await seed(request)) as unknown as { domain: string }).domain;
});

test.afterAll(async ({ playwright }, testInfo: TestInfo) => {
  const dir = path.join("test-results", "a11y");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${testInfo.project.name}.json`), JSON.stringify(findings, null, 2));
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: an approved friends group", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `a11y-host-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Ada",
    lastName: "Host",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EA11Y0001",
  });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E A11y Club ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  joinCode = g.joinCode;
  await loginAs(page, { email: `a11y-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
});

test("public pages", async ({ page }) => {
  for (const url of ["/", "/?for=discord-run", "/?for=friends-join", "/privacy", "/terms", "/account", `/join/${joinCode}`, `/${domain}`, "/no-such-page"]) {
    await visit(page, url);
  }
});

test("a member's pages", async ({ page }) => {
  await loginAs(page, { email: `giver@${E}` });
  await visit(page, "/", "home (member)");
  await visit(page, "/groups");
  await visit(page, "/account", "your data (member)");
});

test("a new member's profile window", async ({ page }, testInfo) => {
  await loginAs(page, { email: `a11y-new-${testInfo.project.name}@${E}` });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "home (profile window)");
});

test("an organiser's pages", async ({ page }, testInfo) => {
  await loginAs(page, { email: `a11y-host-${testInfo.project.name}@${E}` });
  await visit(page, "/", "home (friends group)");
  await visit(page, `/groups/${groupId}/manage`, "organiser console");
  await page.getByRole("tab", { name: "Bring your team" }).click();
  await audit(page, "organiser console: bring your team");
  await page.getByRole("tab", { name: "Settings" }).click();
  await audit(page, "organiser console: settings");
  await visit(page, `/groups/${groupId}/poster`, "poster");
});

test("the site admin's pages", async ({ page }, testInfo) => {
  await loginAs(page, { email: `a11y-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  for (const p of ["", "/approvals", "/season", "/groups", "/users", "/links", "/kudos", "/insights", "/affiliate", "/settings"]) {
    await visit(page, `/admin${p}`);
  }
});

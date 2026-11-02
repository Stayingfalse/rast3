import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, seed, settle, snap } from "./helpers";

/**
 * Day 31: full regression crawl. Signed out, as a member, as an organiser
 * and as a site admin, at desktop and Pixel 7: start from each one's pages
 * and follow every link on the site (a few pages per kind of address).
 * Every page must load without a server error, a script error, a console
 * error or a failed request, and every link must lead somewhere. Findings
 * go to test-results/regression/<project>.json; screenshots of every kind
 * of page to test-results/screenshots.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, p: string, input?: unknown) =>
  r.post(`/api/trpc/${p}`, { data: { json: input ?? null } });

type Finding = { role: string; page: string; kind: string; detail: string };
const findings: Finding[] = [];
const visited: { role: string; page: string; status: number | undefined; ms: number }[] = [];
let groupId = "";
let joinCode = "";
let domain = "";

/** /groups/abc123/manage -> /groups/:id/manage, so each kind of page is crawled a few times, not every one */
const pattern = (p: string) =>
  p
    .split("/")
    .map((s, i) => (i > 0 && /\d/.test(s) && s.length >= 8 ? ":id" : s))
    .join("/");
const PER_PATTERN = 2;
const MAX_PAGES = 45;
/** links never followed: leaving the site, signing out, downloads */
const skip = (url: URL) =>
  url.pathname.startsWith("/api/auth/") || url.pathname === "/api/account/export" || url.pathname.endsWith(".png");

async function crawl(page: Page, role: string, starts: string[], testInfo: TestInfo) {
  const origin = new URL(page.url() === "about:blank" ? testInfo.project.use.baseURL! : page.url()).origin;
  const seen = new Map<string, number>();
  const shot = new Set<string>();
  const queue = [...starts];
  const done = new Set<string>();
  let current = "";

  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (e) => findings.push({ role, page: current, kind: "script error", detail: e.message }));
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.origin === origin && r.status() >= 500) failed.push(`${r.status()} ${u.pathname}`);
  });
  page.on("requestfailed", (r) => {
    const u = new URL(r.url());
    // navigating away cancels requests still in flight; those aren't failures
    if (u.origin === origin && !(r.failure()?.errorText ?? "").includes("ERR_ABORTED")) {
      failed.push(`${r.failure()?.errorText} ${u.pathname}`);
    }
  });

  while (queue.length && done.size < MAX_PAGES) {
    const next = queue.shift()!;
    if (done.has(next)) continue;
    const kind = pattern(new URL(next, origin).pathname);
    if ((seen.get(kind) ?? 0) >= PER_PATTERN) continue;
    seen.set(kind, (seen.get(kind) ?? 0) + 1);
    done.add(next);
    current = next;
    consoleErrors.length = 0;
    failed.length = 0;

    const t0 = Date.now();
    const res = await page.goto(next, { waitUntil: "load" }).catch((e: Error) => {
      findings.push({ role, page: next, kind: "navigation", detail: e.message });
      return null;
    });
    if (!res) continue;
    await settle(page);
    visited.push({ role, page: next, status: res.status(), ms: Date.now() - t0 });
    if (res.status() >= 400) findings.push({ role, page: next, kind: "status", detail: String(res.status()) });
    for (const c of consoleErrors) findings.push({ role, page: next, kind: "console error", detail: c });
    for (const f of failed) findings.push({ role, page: next, kind: "failed request", detail: f });

    if (!shot.has(kind)) {
      shot.add(kind);
      await snap(page, testInfo, `regression-${role}${kind.replace(/[/:]+/g, "-").replace(/-$/, "") || "-home"}`);
    }

    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== origin || skip(url)) continue;
      if (url.pathname.startsWith("/api/")) {
        // API links (e.g. "open on Amazon") are checked, not visited
        const r = await page.request.get(url.pathname + url.search, { maxRedirects: 0 });
        if (r.status() >= 400) findings.push({ role, page: next, kind: "broken link", detail: `${r.status()} ${url.pathname}` });
        continue;
      }
      const target = url.pathname + url.search;
      if (!done.has(target)) queue.push(target);
    }
  }
  page.removeAllListeners("pageerror");
  page.removeAllListeners("console");
  page.removeAllListeners("response");
  page.removeAllListeners("requestfailed");
}

const report = (role: string) => {
  const mine = findings.filter((f) => f.role === role);
  expect.soft(mine, mine.map((f) => `${f.page}: ${f.kind}: ${f.detail}`).join("\n")).toEqual([]);
  expect(visited.filter((v) => v.role === role).length).toBeGreaterThan(1);
};

test.beforeAll(async ({ request }) => {
  domain = ((await seed(request)) as unknown as { domain: string }).domain;
});

test.afterAll(async ({ playwright }, testInfo) => {
  const dir = path.join("test-results", "regression");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${testInfo.project.name}.json`), JSON.stringify({ visited, findings }, null, 2));
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: an approved friends group with an organiser", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `reg-host-${p}@${E}` });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Rae",
    lastName: "Host",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EREG00001",
  });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Regression ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  joinCode = g.joinCode;
  await loginAs(page, { email: `reg-site-${p}@${E}`, adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  await page.goto("about:blank");
});

test("signed out", async ({ page }, testInfo) => {
  await crawl(
    page,
    "visitor",
    ["/", "/?for=discord-run", "/?for=friends-join", "/privacy", "/terms", "/account", `/join/${joinCode}`, `/${domain}`, "/auth/verify-request", "/unsubscribe"],
    testInfo,
  );
  report("visitor");
});

test("a member with gifts", async ({ page }, testInfo) => {
  await loginAs(page, { email: `giver@${E}` });
  await crawl(page, "member", ["/", "/groups", "/account"], testInfo);
  report("member");
});

test("an organiser", async ({ page }, testInfo) => {
  await loginAs(page, { email: `reg-host-${testInfo.project.name}@${E}` });
  await crawl(page, "organiser", ["/", `/groups/${groupId}/manage`, `/groups/${groupId}/poster`, "/groups"], testInfo);
  report("organiser");
});

test("a site admin", async ({ page }, testInfo) => {
  await loginAs(page, { email: `reg-site-${testInfo.project.name}@${E}`, adminLevel: "SITE" });
  await crawl(
    page,
    "admin",
    ["/admin", "/admin/approvals", "/admin/season", "/admin/groups", "/admin/users", "/admin/links", "/admin/kudos", "/admin/insights", "/admin/affiliate", "/admin/settings"],
    testInfo,
  );
  report("admin");
});

import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, testHeaders } from "./helpers";

/**
 * A wishlist but no group (owner, 27 Nov): nobody can pick the list up, so
 * a few days after saving it the member hears how to join or start a group.
 * Once a season; not to someone who saved theirs today, nor to a member of
 * a group.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const who = (name: string, p: string) => `ng-${name}-${p}@${E}`;
const list = (n: string) => `https://www.amazon.co.uk/hz/wishlist/ls/E2ENGR000${n}`;

type Log = { kind: string; status: string; email: string };
const noGroupEmails = async (r: APIRequestContext, p: string, beforeOpening: string[] = []) => {
  const res = await r.post("/api/test-auth/reminders", { headers: testHeaders, data: { beforeOpening } });
  expect(res.status()).toBe(200);
  const { log } = (await res.json()) as { log: Log[] };
  return log
    .filter((l) => l.kind === "NO_GROUP" && l.email.startsWith("ng-") && l.email.includes(`-${p}@`))
    .map((l) => l.email)
    .sort();
};

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("only a wishlist saved days ago, with no group, is emailed, once", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  for (const [name, n] of [["alone", "1"], ["fresh", "2"], ["member", "3"]] as const) {
    await loginAs(page, { email: who(name, p) });
    const saved = await mutate(page.request, "profile.saveProfile", {
      over16: true,
      firstName: "Nia",
      lastName: name,
      amazonWishlistUrl: list(n),
    });
    expect(saved.status(), await saved.text()).toBe(200);
  }
  // "member" starts a friends group, so they're in one
  const g = await mutate(page.request, "groups.create", { name: `E2E No group ${p}`, kind: "FRIENDS" });
  expect(g.status(), await g.text()).toBe(200);

  // everyone saved their wishlist just now: too soon
  expect(await noGroupEmails(page.request, p)).toEqual([]);
  // "alone" and "member" saved theirs days ago; "fresh" is still new
  expect(await noGroupEmails(page.request, p, [who("alone", p), who("member", p)])).toEqual([who("alone", p)]);
  // never twice in a season
  expect(await noGroupEmails(page.request, p)).toEqual([who("alone", p)]);
});

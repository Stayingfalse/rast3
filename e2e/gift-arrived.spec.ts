import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  testHeaders,
  trackPageErrors,
} from "./helpers";

/**
 * Day 26: gift-received confirmation. A few days after a Santa marks a gift
 * (never on the day), the person it was for sees it on their home page and
 * can say it arrived; the gift check-in email's button does the same without
 * signing in. The Santa sees that it landed, and nothing else.
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

type Gift = { id: string; receivedAt: string | null; thanked: boolean };
type Log = { kind: string; email: string; ref: string; arrived?: string };
const who = (name: string, p: string) => `arr-${name}-${p}@${E}`;
const list = (name: string, p: string) =>
  `https://www.amazon.co.uk/hz/wishlist/ls/${`E2EARR${name.toUpperCase()}${p.length}`.padEnd(13, "0")}`;
const giftsToMe = async (r: APIRequestContext) => (await unwrap(await query(r, "wishlist.giftsToMe"))) as Gift[];
const reminders = async (r: APIRequestContext, data: { ageGifts?: number; run?: boolean }) => {
  const res = await r.post("/api/test-auth/reminders", { headers: testHeaders, data });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { log: Log[] }).log;
};

let groupId = "";
let groupName = "";

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: Santa gifts Ina's and Gus's lists", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  groupName = `E2E Arrived ${p}`;
  const profile = (name: string) =>
    mutate(page.request, "profile.saveProfile", {
      firstName: name,
      lastName: "Arrived",
      amazonWishlistUrl: list(name, p),
    });

  await loginAs(page, { email: who("ina", p) });
  expect((await profile("Ina")).status()).toBe(200);
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: groupName, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  groupId = g.id;
  for (const name of ["Gus", "Santa"]) {
    await loginAs(page, { email: who(name.toLowerCase(), p) });
    expect((await profile(name)).status()).toBe(200);
    expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  }

  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId, status: "ACTIVE" })).status()).toBe(200);
  expect((await mutate(page.request, "admin.setOpenEarly", { groupId, open: true })).status()).toBe(200);
  expect(
    (await mutate(page.request, "admin.setGroupAffiliate", { groupId, mode: "OFF", tag: null })).status(),
  ).toBe(200);

  await loginAs(page, { email: who("santa", p) });
  expect((await mutate(page.request, "wishlist.requestFromGroup", { groupId, count: 2 })).status()).toBe(200);
  const held = (await unwrap(await query(page.request, "wishlist.getMyAssignments", { groupId }))) as {
    id: string;
  }[];
  expect(held).toHaveLength(2);
  for (const a of held) {
    expect((await mutate(page.request, "wishlist.markPurchase", { assignmentId: a.id })).status()).toBe(200);
  }

  // on the day, Ina hears nothing (it would spoil the surprise)
  await loginAs(page, { email: who("ina", p) });
  expect(await giftsToMe(page.request)).toEqual([]);
});

test("days later, Ina says it arrived and her Santa sees it landed", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await reminders(page.request, { ageGifts: 5, run: false });

  await loginAs(page, { email: who("ina", p) });
  await page.goto("/");
  const card = page.getByRole("region", { name: "A Santa sent you something" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("button", { name: "Say thank you" })).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await settle(page);
  await snap(page, testInfo, "gift-arrived-card");
  await card.getByRole("button", { name: "It's arrived" }).click();
  await expect(card.getByText(/· arrived/)).toBeVisible();
  await expect(card.getByRole("button", { name: "It's arrived" })).toHaveCount(0);

  // Gus can't say Ina's gift arrived
  const inaGift = (await giftsToMe(page.request))[0]!;
  expect(inaGift.receivedAt).not.toBeNull();
  await loginAs(page, { email: who("gus", p) });
  expect((await mutate(page.request, "wishlist.confirmArrived", { purchaseId: inaGift.id })).status()).toBe(404);
  expect((await giftsToMe(page.request))[0]!.receivedAt).toBeNull();

  // Santa's parcel for Ina's list says it arrived
  await loginAs(page, { email: who("santa", p) });
  await page.goto("/");
  await page.getByRole("tablist", { name: "Gifting in" }).getByRole("tab", { name: groupName }).click();
  const panel = page.getByRole("tabpanel", { name: groupName });
  await expect(panel.getByText("It arrived. Thank you, Santa!")).toHaveCount(1);
  await expect(panel.getByText("Gifted. Thank you!")).toHaveCount(1);
  await settle(page);
  await snap(page, testInfo, "gift-arrived-santa");
  expect(errors).toEqual([]);
});

test("the check-in email's button says it arrived, without signing in", async ({
  page,
  browser,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  // Gus is checked in on; Ina isn't (she already said hers arrived)
  const checkIns = (await reminders(page.request, {})).filter(
    (l) => l.kind === "GIFT_CHECK_IN" && l.email.startsWith("arr-") && l.email.endsWith(`-${p}@${E}`),
  );
  expect(checkIns.map((l) => l.email)).toEqual([who("gus", p)]);
  const link = checkIns[0]!.arrived!;

  // a fresh browser with no session, as from a mail app
  const { baseURL, proxy } = testInfo.project.use;
  const ctx = await browser.newContext({ baseURL, proxy });
  const mail = await ctx.newPage();
  await mail.goto(link);
  await expect(mail.getByRole("heading", { name: "Has something arrived?" })).toBeVisible();
  await mail.getByRole("button", { name: "Yes, something's arrived" }).click();
  await expect(mail.getByRole("heading", { name: "Lovely. Your Santa will know it arrived." })).toBeVisible();
  // a tampered link does nothing
  await mail.goto(link.replace(/t=./, "t=x"));
  await expect(mail.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await ctx.close();

  await loginAs(page, { email: who("gus", p) });
  expect((await giftsToMe(page.request))[0]!.receivedAt).not.toBeNull();
  // and it isn't checked in on again
  const again = (await reminders(page.request, {})).filter(
    (l) => l.kind === "GIFT_CHECK_IN" && l.email === who("gus", p),
  );
  expect(again).toHaveLength(1);
  expect(errors).toEqual([]);
});

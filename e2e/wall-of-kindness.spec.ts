import { expect, test, type APIRequestContext } from "@playwright/test";

import { getChristmasIdentity } from "../src/lib/festive-name";
import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  settle,
  snap,
  trackPageErrors,
} from "./helpers";

/**
 * Day 34: the Wall of Kindness. A group's thank-yous on one public page and
 * image, under festive names, made by the group's organisers once it has 3
 * visible thank-yous. Never real names, emails, the gift or photos; hidden
 * thank-yous never appear.
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

const who = (name: string, p: string) => `wall-${name}-${p}@${E}`;
const SURNAME = "Kindlywall";
const msg = (what: string, p: string) => `E2E wall ${what} thank-you ${p}`;
const state = { groupId: "", code: "", label: "", ann: "", bea: "", hiddenId: "", laterId: "" };
const makeWall = (r: APIRequestContext) =>
  mutate(r, "share.create", { kind: "wall", groupId: state.groupId, label: state.label });

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("set up: a friends group with two visible thank-yous and a hidden one", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const p = testInfo.project.name;
  state.label = `E2E Wall Club ${p}`;
  const profile = async (first: string, n: string) =>
    expect(
      (
        await mutate(page.request, "profile.saveProfile", {
          over16: true,
          firstName: first,
          lastName: SURNAME,
          amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/E2EWALL000${n}`,
        })
      ).status(),
    ).toBe(200);
  const thank = async (what: string) => {
    const res = await mutate(page.request, "kudos.createKudos", { message: msg(what, p), images: [] });
    expect(res.status()).toBe(200);
    return ((await unwrap(res)) as { id: string }).id;
  };

  // Ann starts the group; Bea joins; Eve is in no group
  state.ann = (await loginAs(page, { email: who("ann", p) })).userId;
  await profile("Annabel", "1");
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Wall ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  state.groupId = g.id;
  await thank("ann");

  // friends groups are live from the start (6 Nov): the wall waits only for thank-yous
  const fresh = (await unwrap(await query(page.request, "share.wall", { groupId: g.id }))) as { live: boolean };
  expect(fresh.live).toBe(true);

  state.bea = (await loginAs(page, { email: who("bea", p) })).userId;
  await profile("Beatrix", "2");
  expect((await mutate(page.request, "groups.join", { code: g.joinCode })).status()).toBe(200);
  await thank("bea");
  state.hiddenId = await thank("hidden");

  await loginAs(page, { email: who("eve", p) });
  await profile("Evangeline", "3");

  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  expect((await mutate(page.request, "groups.setStatus", { groupId: g.id, status: "ACTIVE" })).status()).toBe(200);
  expect(
    (await mutate(page.request, "kudos.adminHideKudos", { kudosId: state.hiddenId, hidden: true })).status(),
  ).toBe(200);
});

test("a group with fewer than 3 visible thank-yous can't have a wall", async ({ page }, testInfo) => {
  await loginAs(page, { email: who("ann", testInfo.project.name) });
  // three thank-yous, but one is hidden
  const status = (await unwrap(await query(page.request, "share.wall", { groupId: state.groupId }))) as {
    thanks: number;
    ready: boolean;
  };
  expect(status).toMatchObject({ thanks: 2, ready: false });
  expect((await makeWall(page.request)).status()).toBe(412);

  // the console says how many to go
  await page.goto(`/groups/${state.groupId}/manage`);
  await expect(page.getByText("1 to go")).toBeVisible();
  await expect(page.getByRole("button", { name: "Make the wall" })).toBeDisabled();
});

test("only the group's organisers can make its wall", async ({ page, request }, testInfo) => {
  const p = testInfo.project.name;
  // a third visible thank-you makes the group ready
  await loginAs(page, { email: who("bea", p) });
  const later = await mutate(page.request, "kudos.createKudos", { message: msg("later", p), images: [] });
  expect(later.status()).toBe(200);
  state.laterId = ((await unwrap(later)) as { id: string }).id;

  // a member
  expect((await makeWall(page.request)).status()).toBe(403);
  expect((await query(page.request, "share.wall", { groupId: state.groupId })).status()).toBe(403);
  // someone outside the group
  await loginAs(page, { email: who("eve", p) });
  expect((await makeWall(page.request)).status()).toBe(403);
  // signed out
  expect((await makeWall(request)).status()).toBe(401);
});

test("an organiser makes the wall from the organiser console", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await loginAs(page, { email: who("ann", testInfo.project.name) });
  await page.goto(`/groups/${state.groupId}/manage`);
  await page.getByLabel("Name on the wall").fill(state.label);
  await page.getByRole("button", { name: "Make the wall" }).click();

  const sheet = page.getByRole("dialog", { name: "Share your Wall of Kindness" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("img", { name: "Your share card" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Copy link/ })).toBeEnabled();
  await settle(page);
  await snap(page, testInfo, "wall-share-sheet");

  // the same wall each time: the link doesn't change
  const made = (await unwrap(await makeWall(page.request))) as { code: string; path: string };
  expect(made.path).toBe(`/wall/${made.code}`);
  state.code = made.code;
  const status = (await unwrap(await query(page.request, "share.wall", { groupId: state.groupId }))) as {
    ready: boolean;
    path: string;
  };
  expect(status).toMatchObject({ ready: true, path: made.path });
  expect(errors).toEqual([]);
});

test("the public wall shows festive names, never real names, emails or hidden thank-yous", async ({ page, request }, testInfo) => {
  const errors = trackPageErrors(page);
  const p = testInfo.project.name;
  await page.context().clearCookies();
  const res = await page.goto(`/wall/${state.code}`);
  expect(res?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(state.label);
  const notes = page.getByRole("list", { name: "Thank-yous" });
  for (const what of ["ann", "bea", "later"]) await expect(notes.getByText(msg(what, p))).toBeVisible();
  await expect(page.getByText(msg("hidden", p))).toHaveCount(0);
  await expect(notes.getByText(getChristmasIdentity(state.ann).name).first()).toBeVisible();
  await expect(notes.getByText(getChristmasIdentity(state.bea).name).first()).toBeVisible();

  const html = await page.content();
  for (const secret of ["Annabel", "Beatrix", SURNAME, E, "wall-ann", "wall-bea", state.ann, state.bea]) {
    expect(html, `the page mentions ${secret}`).not.toContain(secret);
  }

  // not for search engines; a link preview image
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/wall\/\w+\/card\.png$/);
  const card = await request.get(`/wall/${state.code}/card.png`);
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");

  // no sideways scrolling
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await settle(page);
  await snap(page, testInfo, "wall-of-kindness");
  expect(errors).toEqual([]);
});

test("a wall that drops under 3 visible thank-yous is taken down", async ({ page, request }, testInfo) => {
  await loginAs(page, { email: who("site", testInfo.project.name), adminLevel: "SITE" });
  expect(
    (await mutate(page.request, "kudos.adminHideKudos", { kudosId: state.laterId, hidden: true })).status(),
  ).toBe(200);
  expect((await request.get(`/wall/${state.code}`)).status()).toBe(404);
  expect((await request.get(`/wall/${state.code}/card.png`)).status()).toBe(404);
  // and back up again
  expect(
    (await mutate(page.request, "kudos.adminHideKudos", { kudosId: state.laterId, hidden: false })).status(),
  ).toBe(200);
  expect((await request.get(`/wall/${state.code}`)).status()).toBe(200);
  // made-up codes are not found
  expect((await request.get("/wall/notarealcode")).status()).toBe(404);
});

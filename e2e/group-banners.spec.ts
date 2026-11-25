import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, trackPageErrors } from "./helpers";

/**
 * Promotional banners (owner, 17 Nov): a group's organisers download
 * ready-made images with the join link, in four web sizes, from "Bring your
 * team". Organisers and site admins only, as they carry the join link.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const SIZES = { "1200x628": [1200, 628], "728x90": [728, 90], "300x250": [300, 250], "320x100": [320, 100] } as const;
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const who = (name: string, p: string, retry: number) => `bn-${name}-${p}-${retry}@${E}`;
const state = { groupId: "", joinCode: "" };

/** A PNG's pixel size, from its header. */
const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("an organiser downloads the group's banners in four sizes", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("host", p, testInfo.retry) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Bea",
    lastName: "Banner",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EBANNER1",
  });
  const g = (await unwrap(
    await mutate(page.request, "groups.create", { name: `E2E Banner Club ${p}`, kind: "FRIENDS" }),
  )) as { id: string; joinCode: string };
  state.groupId = g.id;
  state.joinCode = g.joinCode;

  for (const [size, [w, h]] of Object.entries(SIZES)) {
    const res = await page.request.get(`/groups/${g.id}/banners/${size}`);
    expect(res.status(), size).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    // drawn at twice the size, for high-density screens
    expect(pngSize(await res.body())).toEqual([w * 2, h * 2]);
  }
  const dl = await page.request.get(`/groups/${g.id}/banners/728x90?download=1`);
  expect(dl.headers()["content-disposition"]).toMatch(/attachment; filename="raosanta-e2e-banner-club-[a-z]+-728x90\.png"/);
  expect((await page.request.get(`/groups/${g.id}/banners/999x999`)).status()).toBe(404);

  // the console's card: a preview and a download for each size
  const errors = trackPageErrors(page);
  await page.goto(`/groups/${g.id}/manage`);
  await page.getByRole("tab", { name: "Bring your team" }).click();
  for (const [w, h] of Object.values(SIZES)) {
    await expect(page.getByRole("link", { name: `Download ${w} × ${h}` })).toHaveAttribute("href", /\?download=1$/);
  }
  const preview = page.getByRole("img", { name: /1200 by 628 banner/ });
  await preview.scrollIntoViewIfNeeded();
  await expect.poll(() => preview.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(2400);
  await settle(page);
  await snap(page, testInfo, "group-banners");
  expect(errors).toEqual([]);
});

test("members who don't organise it, and visitors, can't get them", async ({ page, playwright }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: who("member", p, testInfo.retry) });
  await mutate(page.request, "profile.saveProfile", {
    over16: true,
    firstName: "Max",
    lastName: "Member",
    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/E2EBANNER2",
  });
  expect((await mutate(page.request, "groups.join", { code: state.joinCode })).status()).toBe(200);
  expect((await page.request.get(`/groups/${state.groupId}/banners/1200x628`)).status()).toBe(404);

  const { baseURL, proxy } = testInfo.project.use;
  const anon = await playwright.request.newContext({ baseURL, proxy });
  expect((await anon.get(`/groups/${state.groupId}/banners/1200x628`)).status()).toBe(404);
  await anon.dispose();
});

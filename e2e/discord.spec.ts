import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, hasTestLogin, loginAs } from "./helpers";

/**
 * Day 13: community organisers link a Discord server; members without a
 * connected Discord account are asked to connect it. (Dev has no Discord
 * sign-in, so the server check itself is tested by hand on prod.)
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = "e2e.raosanta.test";
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data.json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("organisers link a community to a Discord server", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `discord-org-${p}@${E}` });
  const r = page.request;
  const mk = async (name: string) =>
    ((await unwrap(await mutate(r, "groups.create", { name, kind: "COMMUNITY" }))) as { id: string }).id;
  const a = await mk(`E2E Discord A ${p}`);
  const b = await mk(`E2E Discord B ${p}`);
  // a fresh id per project so the two runs don't collide
  const guild = p === "desktop" ? "112233445566778801" : "112233445566778802";

  expect((await mutate(r, "groups.setDiscordLink", { groupId: a, guildId: "not-an-id" })).status()).toBe(400);
  expect(
    (await mutate(r, "groups.setDiscordLink", { groupId: a, guildId: guild, roleId: "998877665544332211" })).status(),
  ).toBe(200);
  // one server, one group
  expect((await mutate(r, "groups.setDiscordLink", { groupId: b, guildId: guild })).status()).toBe(409);

  await page.goto("/groups");
  const form = page.getByRole("form", { name: "Discord server" }).first();
  await expect(form.getByLabel("Server ID")).toHaveValue(guild);

  // someone else can't change it
  await loginAs(page, { email: `discord-other-${p}@${E}` });
  expect((await mutate(page.request, "groups.setDiscordLink", { groupId: a, guildId: null })).status()).toBe(403);
});

test("without Discord connected, members are asked to connect it", async ({ page }, testInfo) => {
  await loginAs(page, { email: `discord-member-${testInfo.project.name}@${E}` });
  const res = (await unwrap(await mutate(page.request, "groups.discordMatches"))) as {
    needsDiscord: boolean;
  };
  expect(res.needsDiscord).toBe(true);
});

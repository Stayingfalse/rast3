import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs } from "./helpers";

/**
 * Discord linking (Day 13, picker since Day 16). Dev has no Discord sign-in,
 * so this covers the guards and the "connect Discord" path; picking a real
 * server is tried by hand on prod.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
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

test("organisers must connect Discord and can only link servers they run", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  await loginAs(page, { email: `discord-org-${p}@${E}` });
  const r = page.request;
  const a = ((await unwrap(
    await mutate(r, "groups.create", { name: `E2E Discord A ${p}`, kind: "COMMUNITY" }),
  )) as { id: string }).id;

  const servers = (await unwrap(await mutate(r, "groups.discordServers", { groupId: a }))) as {
    needsDiscord: boolean;
  };
  expect(servers.needsDiscord).toBe(true);
  expect((await mutate(r, "groups.setDiscordLink", { groupId: a, guildId: "not-an-id" })).status()).toBe(400);
  expect(
    (await mutate(r, "groups.setDiscordLink", { groupId: a, guildId: "112233445566778801" })).status(),
  ).toBe(412);
  expect((await mutate(r, "groups.setDiscordLink", { groupId: a, guildId: null })).status()).toBe(200);

  await page.goto("/groups");
  const card = page.getByRole("listitem").filter({ hasText: `E2E Discord A ${p}` });
  await expect(
    card.getByRole("region", { name: "Discord server" }).getByRole("button", { name: "Connect Discord" }),
  ).toBeVisible();

  await loginAs(page, { email: `discord-other-${p}@${E}` });
  expect((await mutate(page.request, "groups.discordServers", { groupId: a })).status()).toBe(403);
});

test("without Discord connected, members are asked to connect it", async ({ page }, testInfo) => {
  await loginAs(page, { email: `discord-member-${testInfo.project.name}@${E}` });
  const res = (await unwrap(await mutate(page.request, "groups.discordMatches"))) as {
    needsDiscord: boolean;
  };
  expect(res.needsDiscord).toBe(true);
});

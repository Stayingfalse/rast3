import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, hasTestLogin, loginAs } from "./helpers";

/** Calls a tRPC query the way the client does (superjson, unbatched). */
const query = (request: APIRequestContext, path: string, input?: unknown) =>
  request.get(
    `/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`,
  );

const mutate = (request: APIRequestContext, path: string, input: unknown) =>
  request.post(`/api/trpc/${path}`, { data: { json: input } });

test.describe("public surface", () => {
  for (const path of ["/success", "/debug", "/pwa-test", "/api/test-logging"]) {
    test(`${path} is gone`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(404);
    });
  }

  test("the public kudos feed hides who posted", async ({ request }) => {
    const res = await query(request, "kudos.getFeed", {
      scope: "site",
      limit: 50,
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      result: {
        data: {
          json: {
            items: Array<{
              user: Record<string, unknown>;
              purchase: Record<string, unknown> | null;
            }>;
          };
        };
      };
    };
    for (const item of body.result.data.json.items) {
      expect(item.user).toMatchObject({
        name: null,
        firstName: null,
        lastName: null,
        image: null,
        department: null,
      });
      // Only the wishlist owner's id is sent, for the festive "to" name
      expect(JSON.stringify(item.purchase ?? {})).not.toMatch(
        /notes|name|email/i,
      );
    }
  });

  test("admin APIs need a session", async ({ request }) => {
    const res = await query(request, "user.getAll");
    expect(res.status()).toBe(401);
  });
});

test.describe("members can't use organiser APIs", () => {
  test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");

  test.afterAll(async ({ playwright }, testInfo) => {
    const { baseURL, proxy } = testInfo.project.use;
    const request = await playwright.request.newContext({ baseURL, proxy });
    await deleteTestUsers(request);
    await request.dispose();
  });

  test("queries and mutations are forbidden", async ({ page }, testInfo) => {
    const { userId } = await loginAs(page, {
      email: `member-sec-${testInfo.project.name}@e2e.raosanta.test`,
      adminLevel: "USER",
    });
    const req = page.request;

    for (const path of [
      "user.getAll",
      "user.getStats",
      "link.getAll",
      "domain.getAll",
    ]) {
      expect((await query(req, path)).status(), path).toBe(403);
    }
    expect(
      (await query(req, "user.getUserStats", { userId })).status(),
    ).toBe(403);

    const mutations: Array<[string, unknown]> = [
      [
        "user.updateAdminLevel",
        { userId, adminLevel: "DOMAIN", adminScope: "e2e.raosanta.test" },
      ],
      ["user.toggleProfileCompletion", { userId, completed: true }],
      ["user.delete", { userId: "someone-else" }],
      ["domain.create", { name: "e2e-sec.raosanta.test" }],
      ["domain.toggleEnabled", { id: "any" }],
      ["profile.createDepartment", { name: "Sneaky", domain: "e2e.raosanta.test" }],
    ];
    for (const [path, input] of mutations) {
      expect((await mutate(req, path, input)).status(), path).toBe(403);
    }

    // And nothing changed
    const session = await req.get("/api/auth/session");
    expect(session.status()).toBe(200);
    const me = await query(req, "profile.getCurrentProfile");
    const profile = (await me.json()) as {
      result: { data: { json: { adminLevel: string } } };
    };
    expect(profile.result.data.json.adminLevel).toBe("USER");
  });
});

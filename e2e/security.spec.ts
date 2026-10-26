import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs } from "./helpers";

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
            items: Array<Record<string, unknown> & { user: Record<string, unknown> }>;
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
      });
      // nor which gift it thanks, or who moderated it: a Santa could match
      // the gift to their own and learn whose list it was
      expect(item).toMatchObject({ purchaseId: null, moderatedBy: null });
      expect(item).not.toHaveProperty("userId");
      expect(item).not.toHaveProperty("purchase");
    }
  });

  test("health shows no exact counts", async ({ request }) => {
    const body = (await (await request.get("/api/health")).json()) as {
      database: Record<string, unknown>;
    };
    expect(body.database).toEqual({ connected: true });
  });

  test("admin APIs need a session", async ({ request }) => {
    const res = await query(request, "admin.users", { q: "" });
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
      email: `member-sec-${testInfo.project.name}@${E2E_DOMAIN}`,
      adminLevel: "USER",
    });
    const req = page.request;

    for (const [path, input] of [
      ["admin.overview", undefined],
      ["admin.users", { q: "" }],
      ["admin.groups", {}],
      ["link.getAll", undefined],
    ] as const) {
      expect((await query(req, path, input)).status(), path).toBe(403);
    }

    const mutations: Array<[string, unknown]> = [
      ["admin.setSiteAdmin", { userId, siteAdmin: true }],
      ["admin.deleteUser", { userId: "someone-else" }],
      ["groups.setStatus", { groupId: "any", status: "ACTIVE" }],
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

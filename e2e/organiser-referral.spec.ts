import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  deleteTestUsers,
  E2E_DOMAIN,
  hasTestLogin,
  loginAs,
  testHeaders,
} from "./helpers";

/**
 * "Know another group?" (owner approved the wording, 28 Nov): once a group
 * has been open two days, its organiser is asked, once a season, whether
 * they know another group. Not for a group that opened today; one email per
 * organiser however many groups they run. Its links all open (dev mailbox).
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
const DAY = 24 * 3600_000;
const ukDay = (days: number) =>
  new Date(Date.now() + days * DAY).toLocaleDateString("en-CA", {
    timeZone: "Europe/London",
  });
const unwrap = async (res: { json: () => Promise<unknown> }) =>
  ((await res.json()) as { result: { data: { json: unknown } } }).result.data
    .json;
const mutate = (r: APIRequestContext, path: string, input?: unknown) =>
  r.post(`/api/trpc/${path}`, { data: { json: input ?? null } });
const who = (name: string, p: string) => `or-${name}-${p}@${E}`;

type Log = { kind: string; email: string };
const referrals = async (r: APIRequestContext, p: string) => {
  const res = await r.post("/api/test-auth/reminders", {
    headers: testHeaders,
    data: {},
  });
  expect(res.status()).toBe(200);
  const { log } = (await res.json()) as { log: Log[] };
  return log
    .filter(
      (l) =>
        l.kind === "ORGANISER_REFERRAL" &&
        l.email.startsWith("or-") &&
        l.email.includes(`-${p}@`),
    )
    .map((l) => l.email)
    .sort();
};

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

test("organisers of a group open two days hear once; a group opened today waits", async ({
  page,
}, testInfo) => {
  const p = testInfo.project.name;
  const groups: Record<string, string> = {};
  // "early" runs two groups; "today" runs one that opens today
  for (const [host, names] of [
    ["early", ["A", "B"]],
    ["today", ["C"]],
  ] as const) {
    await loginAs(page, { email: who(host, p) });
    await mutate(page.request, "profile.saveProfile", {
      over16: true,
      firstName: `Olly ${host}`,
      lastName: "Organiser",
      amazonWishlistUrl: `https://www.amazon.co.uk/hz/wishlist/ls/E2EORG${host.toUpperCase()}`,
    });
    for (const n of names) {
      const g = await mutate(page.request, "groups.create", {
        name: `E2E Referral ${n} ${p}`,
        kind: "FRIENDS",
      });
      expect(g.status(), await g.text()).toBe(200);
      groups[n] = ((await unwrap(g)) as { id: string }).id;
    }
  }
  // a site admin sets the dates: A and B opened three days ago, C today
  await loginAs(page, { email: who("site", p), adminLevel: "SITE" });
  for (const [n, days] of [
    ["A", -3],
    ["B", -3],
    ["C", 0],
  ] as const) {
    const set = await mutate(page.request, "groups.setLaunchDate", {
      groupId: groups[n],
      date: ukDay(days),
    });
    expect(set.status(), await set.text()).toBe(200);
  }

  expect(await referrals(page.request, p)).toEqual([who("early", p)]);
  // once a season, not once per group
  expect(await referrals(page.request, p)).toEqual([who("early", p)]);
});

test("the email's links all open a page of ours", async ({
  page,
  baseURL,
}, testInfo) => {
  const to = who("early", testInfo.project.name);
  await loginAs(page, { email: to });
  await page.request.delete(
    `/api/test-auth/mailbox?to=${encodeURIComponent(to)}`,
    { headers: testHeaders },
  );
  const sent = await page.request.post("/api/test-auth/mailbox", {
    headers: testHeaders,
    data: { to, template: "organiserReferral" },
  });
  expect(sent.status(), await sent.text()).toBe(200);
  let mail: { subject: string; text: string; links: string[] } | undefined;
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `/api/test-auth/mailbox?to=${encodeURIComponent(to)}`,
          { headers: testHeaders },
        );
        mail = ((await res.json()) as { messages: (typeof mail)[] })
          .messages[0];
        return mail !== undefined;
      },
      { timeout: 30_000, intervals: [1000] },
    )
    .toBe(true);
  expect(mail!.subject).toBe(
    "Gifting is open. Know another group that would like this?",
  );
  expect(mail!.text).toContain("Hi Olly early,");
  expect(mail!.text).toContain("Thank you for running E2E Referral A");
  const origin = new URL(baseURL!).origin;
  expect(
    mail!.links.some((l) => /\/groups\/\w+\/manage$/.test(new URL(l).pathname)),
  ).toBe(true);
  for (const link of mail!.links) {
    expect(new URL(link).origin, link).toBe(origin);
    expect(
      (await page.request.get(link, { maxRedirects: 5 })).status(),
      link,
    ).toBeLessThan(400);
  }
});

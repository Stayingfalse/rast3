import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { deleteTestUsers, E2E_DOMAIN, hasTestLogin, loginAs, settle, snap, testHeaders, trackPageErrors } from "./helpers";

/**
 * Real emails, end to end (26 Nov). Dev sends its email to a test mailbox
 * (Mailpit, ras/mailpit), so these tests open what a member would get and
 * follow its links. Every email bug of 15-26 Nov hid here: an expired Gmail
 * token, Outlook's button using up the link, and every link under /api/auth.
 */
test.skip(!hasTestLogin, "E2E_TEST_LOGIN_SECRET not set");
test.describe.configure({ mode: "serial" });

const E = E2E_DOMAIN;
type Mail = { subject: string; from: string; text: string; links: string[] };

const inbox = async (r: APIRequestContext, to: string) => {
  const res = await r.get(`/api/test-auth/mailbox?to=${encodeURIComponent(to)}`, { headers: testHeaders });
  expect(res.status(), await res.text()).toBe(200);
  return ((await res.json()) as { messages: Mail[] }).messages;
};
const clear = (r: APIRequestContext, to: string) =>
  r.delete(`/api/test-auth/mailbox?to=${encodeURIComponent(to)}`, { headers: testHeaders });
/** Waits for the address's newest email (up to 30 s). */
async function newest(r: APIRequestContext, to: string) {
  let mail: Mail | undefined;
  await expect
    .poll(async () => (mail = (await inbox(r, to))[0]) !== undefined, { timeout: 30_000, intervals: [1000] })
    .toBe(true);
  return mail!;
}

test.afterAll(async ({ playwright }, testInfo) => {
  const { baseURL, proxy } = testInfo.project.use;
  const request = await playwright.request.newContext({ baseURL, proxy });
  await deleteTestUsers(request);
  await request.dispose();
});

async function openEmailSignIn(page: Page) {
  await page.goto("/?for=invited");
  await page.getByRole("button", { name: "Join your group" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Continue with Email" }).click();
  return dialog;
}

test("signing in with a real email link", async ({ page, baseURL }, testInfo) => {
  const errors = trackPageErrors(page);
  const to = `mb-new-${testInfo.project.name}-${Date.now().toString(36)}@${E}`;
  await clear(page.request, to);

  const dialog = await openEmailSignIn(page);
  await dialog.getByLabel("Email address").fill(to);
  await dialog.getByRole("button", { name: "Send Magic Link" }).click();
  // test addresses sit under a test workplace's domain, so the work-email
  // question (24 Nov) may come first: say send it
  const sent = dialog.getByText("We've sent a magic link to");
  const ask = dialog.getByRole("button", { name: "Send to my work email" });
  await expect(sent.or(ask)).toBeVisible();
  if (await ask.isVisible()) await ask.click();
  await expect(sent).toBeVisible();

  const mail = await newest(page.request, to);
  expect(mail.subject).toContain("Sign in to");
  // every link is on this site, and none goes straight to the one-time
  // sign-in address (link scanners would use it up): all via the landing page
  const origin = new URL(baseURL!).origin;
  for (const l of mail.links) expect(new URL(l).origin, l).toBe(origin);
  expect(mail.links.some((l) => new URL(l).pathname.startsWith("/api/auth/callback"))).toBe(false);
  const landing = mail.links.find((l) => new URL(l).pathname === "/auth/magic");
  expect(landing, mail.links.join("\n")).toBeTruthy();

  await page.goto(landing!);
  await settle(page);
  await snap(page, testInfo, "mailbox-sign-in-landing");
  await page.getByRole("link", { name: "Click to Sign In" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/api/auth"));
  const session = (await (await page.request.get("/api/auth/session")).json()) as { user?: { email?: string } };
  expect(session.user?.email).toBe(to);
  expect(errors).toEqual([]);
});

test("every link in the reminder emails opens a page of ours", async ({ page, baseURL }, testInfo) => {
  const to = `mb-member-${testInfo.project.name}@${E}`;
  await loginAs(page, { email: to });
  const origin = new URL(baseURL!).origin;
  for (const template of ["seasonOpen", "checkInNudge", "giftCheckIn"] as const) {
    await clear(page.request, to);
    const sent = await page.request.post("/api/test-auth/mailbox", { headers: testHeaders, data: { to, template } });
    expect(sent.status(), await sent.text()).toBe(200);
    const mail = await newest(page.request, to);
    expect(mail.links.length, template).toBeGreaterThanOrEqual(2);
    for (const link of mail.links) {
      const u = new URL(link);
      // the 26 Nov bug: links went to /api/auth/..., an Auth.js error
      expect(u.origin, `${template}: ${link}`).toBe(origin);
      expect(u.pathname.startsWith("/api/auth"), `${template}: ${link}`).toBe(false);
      const res = await page.request.get(link, { maxRedirects: 5 });
      expect(res.status(), `${template}: ${link}`).toBeLessThan(400);
    }
    // the stop link is the site's own unsubscribe page
    expect(mail.links.some((l) => new URL(l).pathname === "/unsubscribe"), template).toBe(true);
  }
});

test("the mailbox is test-only and for test addresses only", async ({ request }) => {
  expect((await request.get("/api/test-auth/mailbox?to=someone@gmail.com")).status()).toBe(404);
  const res = await request.get("/api/test-auth/mailbox?to=someone@gmail.com", { headers: testHeaders });
  expect(res.status()).toBe(400);
});

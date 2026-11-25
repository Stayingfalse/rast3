#!/usr/bin/env node
/**
 * Records the promo channel's tutorial clips (raosanta.uk on Instagram/YouTube; the videos are made
 * by the TechNews-Bot repo, which plays these inside a phone frame).
 *
 * It drives the real site at phone size (Pixel 7) with the dev-only test login and the e2e seed
 * data, so no real member ever appears. Taps show as a red ripple, text is typed at a natural
 * speed, the test email domain is shown as "elfworks.co.uk" and a local or dev copy's address as
 * raosanta.uk, so the screens read naturally.
 *
 *   BASE_URL=http://localhost:3100 TEST_LOGIN_SECRET=... node scripts/promo-clips/record.mjs [out-dir] [clip ...]
 *
 * BASE_URL defaults to https://dev.raosanta.uk. Needs ffmpeg. Writes <clip>.mp4 (1080x2400, 30 fps,
 * no sound) per clip into out-dir (default ./promo-clips). Frames come from Chrome's screencast at the
 * phone's full pixel density (Playwright's own recorder films at CSS size), placed at their real times. Re-record when the UI changes; copy the
 * files into TechNews-Bot's assets/santa/clips/.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL ?? "https://dev.raosanta.uk";
const SECRET = process.env.TEST_LOGIN_SECRET ?? process.env.E2E_TEST_LOGIN_SECRET ?? "";
const OUT = path.resolve(process.argv[2] ?? "promo-clips");
const ONLY = process.argv.slice(3);
const NS = "promo";
const DOMAIN = `${NS}.e2e.raosanta.test`;
const SHOWN = "elfworks.co.uk";
const HEADERS = { "x-test-login-secret": SECRET, "x-test-namespace": NS };
const SIZE = { width: 1080, height: 2400 }; // Pixel 7's screen in device pixels
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

if (!SECRET) {
  console.error("TEST_LOGIN_SECRET (or E2E_TEST_LOGIN_SECRET) is needed: the clips use the test login");
  process.exit(1);
}

// Taps as ripples, and the test domain shown as a company's
const OVERLAY = `
(() => {
  const DOMAIN = ${JSON.stringify(DOMAIN)}, SHOWN = ${JSON.stringify(SHOWN)};
  const HOST = location.host;  // a local or dev copy shows as the real site
  const swap = (root) => {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.nodeValue && n.nodeValue.includes(DOMAIN)) n.nodeValue = n.nodeValue.split(DOMAIN).join(SHOWN);
      if (n.nodeValue && HOST !== "raosanta.uk" && n.nodeValue.includes(HOST)) n.nodeValue = n.nodeValue.split(HOST).join("raosanta.uk");
    }
    root.querySelectorAll && root.querySelectorAll("input").forEach((i) => {
      if (i.value && i.value.includes(DOMAIN)) i.style.color = "transparent";
    });
  };
  const start = () => {
    swap(document.body);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 ? swap(n) : n.nodeType === 3 && swap(n.parentNode || document.body))))
      .observe(document.body, { childList: true, subtree: true, characterData: true });
    const style = document.createElement("style");
    style.textContent = "@keyframes rao-tap{from{transform:translate(-50%,-50%) scale(.3);opacity:.9}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}" +
      ".rao-tap{position:fixed;width:56px;height:56px;border-radius:50%;background:rgba(184,38,44,.45);border:3px solid #b8262c;pointer-events:none;z-index:2147483647;animation:rao-tap .6s ease-out forwards}";
    document.head.appendChild(style);
    addEventListener("pointerdown", (e) => {
      const d = document.createElement("div");
      d.className = "rao-tap"; d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px";
      document.body.appendChild(d); setTimeout(() => d.remove(), 700);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();`;

async function film(browser, name, run) {
  const tmp = path.join(OUT, `.${name}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const ctx = await browser.newContext({ ...devices["Pixel 7"], baseURL: BASE });
  await ctx.addInitScript(OVERLAY);
  await ctx.addCookies([{ name: "cookie-consent", value: "seen", url: BASE }]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, data });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: SIZE.width, maxHeight: SIZE.height });
  const marks = {};
  const mark = (k) => (marks[k] = Date.now() / 1000);
  try {
    await run(page, mark);
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, `${name}-failed.png`) }).catch(() => undefined);
    throw e;
  } finally {
    await cdp.send("Page.stopScreencast").catch(() => undefined);
    await ctx.close();
  }
  // the frames between the marks, each held until the next one (the screencast only sends changes)
  const from = (marks.start ?? frames[0].t) - 0.2;
  const to = (marks.end ?? frames.at(-1).t) + 0.8;
  const keep = frames.filter((f) => f.t >= from && f.t <= to);
  const before = frames.filter((f) => f.t < from).at(-1);
  if (before) keep.unshift({ ...before, t: from });
  const lines = [];
  keep.forEach((f, i) => {
    const file = path.join(tmp, `${String(i).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    const next = i + 1 < keep.length ? keep[i + 1].t : to;
    lines.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(3)}`);
  });
  lines.push(`file '${path.join(tmp, `${String(keep.length - 1).padStart(5, "0")}.jpg`)}'`);
  writeFileSync(path.join(tmp, "list.txt"), lines.join("\n"));
  const out = path.join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"),
    "-vf", `fps=30,scale=${SIZE.width}:${SIZE.height}:force_original_aspect_ratio=decrease,pad=${SIZE.width}:${SIZE.height}:(ow-iw)/2:0:color=0x13264d`,
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-an", `${out}.part.mp4`]);
  renameSync(`${out}.part.mp4`, out);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${name}.mp4  ${(to - from).toFixed(1)} s, ${keep.length} frames`);
}

async function login(page, email, name) {
  const res = await page.request.post("/api/test-auth/login", { headers: HEADERS, data: { email, ...(name ? { name } : {}) } });
  if (res.status() !== 200) throw new Error(`test login: ${res.status()} ${await res.text()}`);
}

/** Removes this namespace's test users, so a clip's addresses can be tidy (no timestamps). */
async function reset(page) {
  const res = await page.request.delete("/api/test-auth/login", { headers: HEADERS });
  if (res.status() !== 200) throw new Error(`reset: ${res.status()}`);
}

async function seed(page) {
  const res = await page.request.post("/api/test-auth/seed", { headers: HEADERS });
  if (res.status() !== 200) throw new Error(`seed: ${res.status()} ${await res.text()}`);
  return res.json();
}

/** Scroll so `locator` sits a third of the way down the screen, smoothly, as a person would. */
async function glide(page, locator, ms = 900) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), box.y - page.viewportSize().height / 3);
  await pause(ms);
}

async function tap(page, locator) {
  await glide(page, locator, 600);
  await locator.click();
}

async function type(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 55 });
}

const CLIPS = {
  // A new member: their profile, with an Amazon wishlist link
  "profile-wishlist": async (page, mark) => {
    await reset(page);
    await login(page, `olive.green@${DOMAIN}`, "Olive");
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Complete Your Profile" });
    await dialog.waitFor();
    await pause(700);
    mark("start");
    await type(dialog.getByLabel("First name"), "Olive");
    await type(dialog.getByLabel("Last name"), "Green");
    await pause(300);
    await type(dialog.getByLabel("Amazon wishlist link"), "https://www.amazon.co.uk/hz/wishlist/ls/2FESTIVE26XY");
    await pause(400);
    await tap(page, dialog.getByLabel("I'm 16 or over"));
    await pause(500);
    await tap(page, dialog.getByRole("button", { name: "Save and choose a group" }));
    await page.getByText("Profile saved.").waitFor();
    await pause(1600);
    mark("end");
  },

  // ...then joining their workplace with a work email and picking a team
  "join-workplace": async (page, mark) => {
    await reset(page);
    await seed(page);
    const email = `walt.winter@${DOMAIN}`;
    await login(page, email, "Walt");
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Complete Your Profile" });
    await dialog.getByLabel("First name").fill("Walt");
    await dialog.getByLabel("Last name").fill("Winter");
    await dialog.getByLabel("Amazon wishlist link").fill("https://www.amazon.co.uk/hz/wishlist/ls/2WINTER26AB");
    await dialog.getByLabel("I'm 16 or over").check();
    await dialog.getByRole("button", { name: "Save and choose a group" }).click();
    const workplace = page.getByRole("region", { name: "Join your workplace" });
    await workplace.waitFor();
    await pause(800);
    mark("start");
    await glide(page, workplace);
    await type(workplace.getByLabel("Work email"), email);
    await pause(300);
    await tap(page, workplace.getByRole("button", { name: "Join workplace" }));
    const team = page.getByLabel("Your team");  // the workplace card (its heading shows as elfworks.co.uk)
    await team.waitFor();
    await pause(900);
    await glide(page, team);
    await team.selectOption({ label: "Elves Workshop" });
    await page.getByText("Team saved").waitFor();
    await pause(1500);
    mark("end");
  },

  // Picking up three random wishlists
  "pick-up": async (page, mark) => {
    const { giver } = await seed(page);
    await login(page, giver.email);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await pause(600);
    mark("start");
    const button = page.getByRole("button", { name: "Get My 3 Wishlist Assignments" });
    await glide(page, button, 1200);
    await pause(500);
    await button.click();
    await page.getByRole("heading", { name: "Your Wishlist Assignments (3)" }).waitFor();
    await pause(600);
    await glide(page, page.getByRole("link", { name: /View Wishlist/ }).first(), 1400);
    await pause(1200);
    mark("end");
  },

  // Buying from one, then marking it Gifted
  "gifted": async (page, mark) => {
    const { giver } = await seed(page);
    await login(page, giver.email);
    await page.goto("/");
    await page.getByRole("button", { name: "Get My 3 Wishlist Assignments" }).click();
    await page.getByRole("heading", { name: "Your Wishlist Assignments (3)" }).waitFor();
    const gifted = page.getByRole("button", { name: "Gifted" }).first();
    await glide(page, gifted, 600);
    await pause(700);
    mark("start");
    await tap(page, gifted);
    await page.getByRole("heading", { name: "Mark Purchase Complete" }).waitFor();
    await pause(500);
    await type(page.getByPlaceholder("What did you buy?"), "A very festive jumper");
    await pause(400);
    await page.getByRole("button", { name: "Confirm Purchase" }).click();
    const sheet = page.getByRole("dialog", { name: /random act/ });
    await sheet.waitFor();
    await sheet.getByRole("img", { name: "Your share card" }).waitFor();
    await pause(2200);
    mark("end");
  },

  // Saying thank you with a postcard
  "thank-you": async (page, mark) => {
    const { giver } = await seed(page);
    await login(page, giver.email);
    await page.goto("/");
    const box = page.getByPlaceholder("Write a short message of thanks...");
    await glide(page, box, 300);
    await page.evaluate(() => window.scrollBy({ top: -120 }));
    await pause(800);
    mark("start");
    await type(box, "The cosiest socks ever. Thank you, Santa!");
    await pause(500);
    await tap(page, page.getByRole("button", { name: "Send Kudos" }));
    // it's posted, and offered as a shareable postcard
    const sheet = page.getByRole("dialog", { name: "Share your thank-you" });
    await sheet.getByRole("img", { name: "Your share card" }).waitFor();
    await pause(2400);
    mark("end");
  },

  // Starting a friends group and getting its invite code
  "friends-group": async (page, mark) => {
    await reset(page);
    await login(page, `frankie.holly@${DOMAIN}`, "Frankie");
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Complete Your Profile" });
    await dialog.getByLabel("First name").fill("Frankie");
    await dialog.getByLabel("Last name").fill("Holly");
    await dialog.getByLabel("Amazon wishlist link").fill("https://www.amazon.co.uk/hz/wishlist/ls/2HOLLY26ABC");
    await dialog.getByLabel("I'm 16 or over").check();
    await dialog.getByRole("button", { name: "Save and choose a group" }).click();
    await page.getByText("Profile saved.").waitFor();
    const field = page.getByLabel("Group name");
    await glide(page, field, 400);
    await pause(700);
    mark("start");
    await type(field, "The Holly Family");
    await pause(400);
    await tap(page, page.getByRole("button", { name: "Start group" }));
    const card = page.getByRole("listitem").filter({ hasText: "The Holly Family" });
    await card.getByLabel(/^Invite code /).waitFor();
    await pause(500);
    await glide(page, card.getByLabel(/^Invite code /), 1300);
    await pause(1500);
    mark("end");
  },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  for (const [name, run] of Object.entries(CLIPS)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    await film(browser, name, run);
  }
} finally {
  await browser.close();
}

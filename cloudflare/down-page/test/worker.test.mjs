// node --test cloudflare/down-page/test/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const page = (extra = {}) => new Request("https://dev.raosanta.uk/", { headers: { accept: "text/html", "sec-fetch-dest": "document", ...extra } });
const api = () => new Request("https://dev.raosanta.uk/api/health", { headers: { accept: "*/*", "sec-fetch-dest": "empty" } });
const origin = (impl) => { globalThis.fetch = impl; };

test("healthy origin passes through untouched", async () => {
  origin(async () => new Response("hello", { status: 200 }));
  const r = await worker.fetch(page());
  assert.equal(r.status, 200); assert.equal(await r.text(), "hello");
});
for (const s of [502, 503, 504, 521, 522, 523, 524, 530]) {
  test(`page load + ${s} -> down page`, async () => {
    origin(async () => new Response("bad", { status: s }));
    const r = await worker.fetch(page());
    assert.equal(r.status, 503); assert.equal(r.headers.get("retry-after"), "60");
    const body = await r.text();
    assert.match(body, /running a little late/); assert.doesNotMatch(body, /\{\{/);
  });
}
test("service-worker refetch of a page (Sec-Fetch-Dest empty) -> down page", async () => {
  origin(async () => new Response("Service is not started", { status: 503 }));
  const r = await worker.fetch(new Request("https://dev.raosanta.uk/groups", { headers: { accept: "text/html,application/xhtml+xml", "sec-fetch-dest": "empty", "sec-fetch-mode": "same-origin" } }));
  assert.equal(r.headers.get("x-raosanta-fallback"), "1");
});
test("API asking for HTML still gets the real error", async () => {
  origin(async () => new Response("bad", { status: 502 }));
  const r = await worker.fetch(new Request("https://dev.raosanta.uk/api/auth/signin", { headers: { accept: "text/html" } }));
  assert.equal(r.status, 502);
});
test("app 500 and 404 are not hidden", async () => {
  for (const s of [500, 404]) { origin(async () => new Response("x", { status: s })); assert.equal((await worker.fetch(page())).status, s); }
});
test("network error / timeout -> down page", async () => {
  origin(async () => { throw new Error("boom"); });
  assert.equal((await worker.fetch(page())).headers.get("x-raosanta-fallback"), "1");
});
test("API and assets keep the real error", async () => {
  origin(async () => new Response("bad gateway", { status: 502 }));
  const r = await worker.fetch(api());
  assert.equal(r.status, 502); assert.equal(await r.text(), "bad gateway");
});
test("POST is never swapped", async () => {
  origin(async () => new Response("x", { status: 502 }));
  const r = await worker.fetch(new Request("https://dev.raosanta.uk/api/trpc/x", { method: "POST", headers: { accept: "text/html" } }));
  assert.equal(r.status, 502);
});
test("/__down previews with 200", async () => {
  origin(async () => { throw new Error("must not hit origin"); });
  assert.equal((await worker.fetch(new Request("https://dev.raosanta.uk/__down"))).status, 200);
});
test("stamp shows the current season's year", async () => {
  const now = new Date(); const y = now.getUTCFullYear();
  const season = String(now.getUTCMonth() < 6 ? y - 1 : y);
  const body = await (await worker.fetch(new Request("https://dev.raosanta.uk/__down"))).text();
  assert.match(body, new RegExp(`class="yr">${season}<`));
});

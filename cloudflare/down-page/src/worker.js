// Cloudflare Worker in front of raosanta.uk (and dev.raosanta.uk).
//
// Every request goes to the origin (the Easypanel server) unchanged. When the
// origin is unreachable or answers with a gateway error, a page load gets the
// self-contained "back shortly" page instead of Cloudflare's error screen.
// API calls, assets and everything that isn't a page load get the origin's
// own response, so clients and health checks see the real failure.
//
// /__down shows the page on demand, for previews and checks.

import PAGE from "./page.generated.js";

// Gateway / origin-unreachable statuses: Traefik (502, 503, 504), Easypanel's
// stopped-service page (503) and Cloudflare's origin errors (52x, 530).
const DOWN = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);

// Give up on a page load after this long and show the page instead.
const PAGE_TIMEOUT_MS = 20_000;

/** The season the wordmark shows: Jan–Jun still belongs to last Christmas. */
function seasonYear(now = new Date()) {
  const y = now.getUTCFullYear();
  return String(now.getUTCMonth() < 6 ? y - 1 : y);
}

function downPage(status = 503) {
  return new Response(PAGE.replaceAll("{{YEAR}}", seasonYear()), {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "60",
      "x-robots-tag": "noindex",
      "x-raosanta-fallback": "1",
    },
  });
}

/**
 * A browser loading a page, not an API call or asset. The site's service
 * worker re-fetches page loads itself, and those requests can arrive with
 * Sec-Fetch-Dest "empty", so the Accept header counts as well.
 */
function isPageLoad(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return false;
  if (request.headers.get("sec-fetch-dest") === "document") return true;
  if (request.headers.get("sec-fetch-mode") === "navigate") return true;
  return (request.headers.get("accept") ?? "").includes("text/html");
}

const worker = {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/__down") return downPage(200);

    if (!isPageLoad(request)) return fetch(request);

    try {
      const res = await fetch(request, { signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
      return DOWN.has(res.status) ? downPage() : res;
    } catch {
      return downPage();
    }
  },
};

// Only the handler is exported: Workers treat named exports as entrypoints.
export default worker;

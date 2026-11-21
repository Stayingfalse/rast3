# Down page (Cloudflare Worker)

When the Easypanel server can't serve the site, page loads get a
self-contained "back shortly" page in the Christmas Post style that links to
https://status.raosanta.uk, instead of Cloudflare's or Easypanel's error screen.

- **Passes everything through** while the origin is healthy. Only page loads
  that come back as a gateway error (502, 503, 504, 52x, 530), fail, or take
  longer than 20s are swapped. App 500s and 404s, API calls (`/api/*`), Next.js
  assets (`/_next/*`) and non-GET requests always get the origin's real response.
- **The page** is one 53 KB HTML response with Archivo (subset, woff2), the
  stamp and the hanging-post sky inlined, so it needs nothing from the origin.
  It checks `/api/health` every 30s (and on "Try again") and reloads onto the
  site once it answers. The stamp's year is the current season, set per request.
- **`/__down`** shows the page on demand (status 200) for previews.
- `public/sw.js` passes the page through (header `x-raosanta-fallback`) rather
  than swapping in a cached home page.

## Routes

`wrangler.toml` routes `raosanta.uk/*` (live since 21 Nov 2026, owner-approved)
and `dev.raosanta.uk/*`. `www.raosanta.uk` never reaches the Worker: a Cloudflare
redirect rule (zone raosanta.uk, Rules → Redirect Rules, "www.raosanta.uk ->
raosanta.uk") sends it to the same path on raosanta.uk with a 301.

## Change it

```bash
pip install fonttools brotli
python3 cloudflare/down-page/build.py          # page.html -> src/page.generated.js
node --test cloudflare/down-page/test/*.test.mjs
cd cloudflare/down-page && npx wrangler@4.50.0 deploy   # needs a Workers API token
```

Edit `src/page.html`, not `src/page.generated.js`.

// Writes the brand assets in public/ from scripts/brand/marks.mjs:
//   public/brand/{stamp,sky-left,sky-right}.svg, public/brand/stamps/<year>.svg,
//   the favicons, app icons and
//   the social preview image (public/og.png).
// Run: node scripts/brand/build.mjs   (needs Playwright's Chromium; the social
// image loads Archivo from Google Fonts, so it needs network access)
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { C, SEASON_FACES, stampMark, skyCluster } from "./marks.mjs";

const out = new URL("../../public/", import.meta.url).pathname;
mkdirSync(`${out}brand`, { recursive: true });

const stamp = stampMark({ showYear: false });
writeFileSync(`${out}brand/stamp.svg`, stamp);
writeFileSync(`${out}brand/sky-left.svg`, skyCluster("left"));
writeFileSync(`${out}brand/sky-right.svg`, skyCluster("right"));

// One stamp per season for the stamp album (the year is set over it in Archivo).
mkdirSync(`${out}brand/stamps`, { recursive: true });
for (const [year, face] of Object.entries(SEASON_FACES)) {
  writeFileSync(
    `${out}brand/stamps/${year}.svg`,
    stampMark({ showYear: false, face }),
  );
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(html, w, h, path, transparent = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}${transparent ? "html,body{background:transparent}" : ""}</style></head><body>${html}</body></html>`,
    { waitUntil: "networkidle" },
  );
  return page.screenshot({ path, omitBackground: transparent, type: "png" });
}

// Browser favicons: the stamp alone on a transparent ground.
const favicon = (size) =>
  `<div style="width:${size}px;height:${size}px;display:grid;place-items:center"><div style="height:${size}px;width:${(size * 108) / 132}px">${stamp}</div></div>`;
const ico = [];
for (const size of [16, 32, 48]) {
  const buf = await render(
    favicon(size),
    size,
    size,
    size === 48 ? undefined : `${out}favicon-${size}x${size}.png`,
    true,
  );
  ico.push({ size, buf });
}

// App icons: the stamp on night navy, inside the maskable safe zone.
const appIcon = (size, scale) =>
  `<div style="width:${size}px;height:${size}px;background:${C.night};display:grid;place-items:center"><div style="height:${size * scale}px;width:${(size * scale * 108) / 132}px;transform:rotate(-4deg)">${stamp}</div></div>`;
await render(appIcon(180, 0.66), 180, 180, `${out}apple-touch-icon.png`);
await render(appIcon(192, 0.58), 192, 192, `${out}android-chrome-192x192.png`);
await render(appIcon(512, 0.58), 512, 512, `${out}android-chrome-512x512.png`);

// favicon.ico with PNG-encoded entries (supported by every current browser).
{
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(ico.length, 4);
  let offset = 6 + 16 * ico.length;
  const dir = [];
  for (const { size, buf } of ico) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size % 256, 0);
    e.writeUInt8(size % 256, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dir.push(e);
  }
  writeFileSync(
    `${out}favicon.ico`,
    Buffer.concat([header, ...dir, ...ico.map((i) => i.buf)]),
  );
}

// Social preview (Open Graph / Twitter), 1200×630.
await render(
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100,400;125,800&display=block">
  <div style="position:relative;width:1200px;height:630px;background:${C.night};overflow:hidden;font-family:Archivo">
    <div style="position:absolute;left:-40px;top:0">${skyCluster("left")}</div>
    <div style="position:absolute;right:-40px;top:0">${skyCluster("right")}</div>
    <div style="position:absolute;left:90px;bottom:84px;display:flex;align-items:center;gap:40px">
      <div style="width:170px;transform:rotate(-4deg)">${stampMark({ year: "2026" })}</div>
      <div>
        <div style="color:${C.frost};font-weight:800;font-stretch:125%;font-size:84px;line-height:.95;letter-spacing:-.01em">Random Acts<br><span style="font-weight:400;font-stretch:100%">of</span> Santa</div>
        <div style="color:${C.frostSoft};font-size:28px;margin-top:22px;font-stretch:100%">Christmas gifts for colleagues, no addresses shared.</div>
      </div>
    </div>
  </div>`,
  1200,
  630,
  `${out}og.png`,
);

await browser.close();
console.log("brand assets written to public/");

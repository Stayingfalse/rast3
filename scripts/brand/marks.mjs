// Brand mark and sky artwork for the Christmas Post world, as SVG strings.
// Used by scripts/brand/build.mjs to write public/brand/* and the icons.
export const C = {
  night: "#13264d",
  nightDeep: "#0c1a37",
  nightRaised: "#1b3363",
  frost: "#e6ecf7",
  frostSoft: "#aebbd4",
  label: "#f6f0e2",
  paper: "#fffdf8",
  rule: "#cdbf9f",
  ink: "#18223a",
  post: "#b8262c",
  postDeep: "#941c21",
  postBright: "#ec6a64",
  gold: "#caa24c",
  goldSoft: "#e5cf98",
  goldInk: "#9c7a2a",
  pine: "#1f5c47",
  ice: "#6fa8c9",
};

// Perforation holes along the edge of a w×h stamp, step s, radius r
function perfHoles(w, h, s, r) {
  const holes = [];
  const nx = Math.round(w / s),
    ny = Math.round(h / s);
  const sx = w / nx,
    sy = h / ny;
  for (let i = 0; i <= nx; i++) {
    holes.push([i * sx, 0], [i * sx, h]);
  }
  for (let j = 1; j < ny; j++) {
    holes.push([0, j * sy], [w, j * sy]);
  }
  return holes
    .map(
      ([x, y]) =>
        `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="#000"/>`,
    )
    .join("");
}

export function bauble({
  cx,
  cy,
  r,
  body = C.post,
  cap = C.gold,
  band = C.label,
  band2 = C.gold,
  string = C.gold,
  stringTop = null,
  sw = 1.5,
}) {
  const capW = r * 0.46,
    capH = r * 0.3,
    capY = cy - r - capH + r * 0.06;
  const s =
    stringTop === null
      ? ""
      : `<line x1="${cx}" y1="${stringTop}" x2="${cx}" y2="${capY - r * 0.12}" stroke="${string}" stroke-width="${sw}"/>
  <circle cx="${cx}" cy="${capY - r * 0.12}" r="${r * 0.09}" fill="none" stroke="${cap}" stroke-width="${sw}"/>`;
  return `${s}
  <rect x="${cx - capW / 2}" y="${capY}" width="${capW}" height="${capH}" rx="${r * 0.06}" fill="${cap}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${body}"/>
  <path d="M ${cx - r * 0.98} ${cy - r * 0.2} Q ${cx} ${cy + r * 0.28} ${cx + r * 0.98} ${cy - r * 0.2}" stroke="${band}" stroke-width="${r * 0.13}" fill="none"/>
  <path d="M ${cx - r * 0.9} ${cy + r * 0.32} Q ${cx} ${cy + r * 0.78} ${cx + r * 0.9} ${cy + r * 0.32}" stroke="${band2}" stroke-width="${r * 0.08}" fill="none"/>
  <ellipse cx="${cx - r * 0.38}" cy="${cy - r * 0.45}" rx="${r * 0.16}" ry="${r * 0.22}" transform="rotate(-30 ${cx - r * 0.38} ${cy - r * 0.45})" fill="${C.paper}" opacity="0.45"/>`;
}

let uid = 0;
// The stamp: a portrait perforated stamp, night panel, red bauble on gold thread.
export function stampMark({
  year = "2026",
  showYear = true,
  w = 100,
  h = 124,
} = {}) {
  const id = `perf${uid++}`;
  const inset = 9;
  const pw = w - inset * 2,
    ph = h - inset * 2;
  const r = pw * 0.33;
  const cy = inset + ph * (showYear ? 0.52 : 0.56);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${w + 8} ${h + 8}">
  <defs><mask id="${id}"><rect x="-4" y="-4" width="${w + 8}" height="${h + 8}" fill="#fff"/>${perfHoles(w, h, 10, 3.4)}</mask></defs>
  <rect width="${w}" height="${h}" fill="${C.paper}" mask="url(#${id})"/>
  <rect x="${inset}" y="${inset}" width="${pw}" height="${ph}" fill="${C.night}"/>
  ${bauble({ cx: w / 2, cy, r, stringTop: inset, sw: 2 })}
  ${showYear ? `<text x="${w / 2}" y="${h - inset - 6}" text-anchor="middle" font-family="Archivo" font-stretch="125%" font-weight="800" font-size="12" letter-spacing="1" fill="${C.goldSoft}">${year}</text>` : ""}
</svg>`;
}

// A small four-point star
export const star = (x, y, s, fill) =>
  `<path d="M ${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z" fill="${fill}"/>`;

// A small hanging stamp
export function hangingStamp(x, top, len, w, h, rot, body) {
  const id = `hs${uid++}`;
  const y = top + len;
  return `<line x1="${x}" y1="${top}" x2="${x}" y2="${y + 4}" stroke="${C.goldSoft}" stroke-width="1.2" opacity="0.8"/>
  <g transform="translate(${x - w / 2} ${y}) rotate(${rot} ${w / 2} 0)">
    <defs><mask id="${id}"><rect x="-4" y="-4" width="${w + 8}" height="${h + 8}" fill="#fff"/>${perfHoles(w, h, 6, 1.9)}</mask></defs>
    <rect width="${w}" height="${h}" fill="${C.paper}" mask="url(#${id})"/>
    <rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="${body}"/>
    ${star(w / 2, h / 2, w * 0.22, C.goldSoft)}
  </g>`;
}

export function hangingTag(x, top, len, rot) {
  const y = top + len;
  return `<line x1="${x}" y1="${top}" x2="${x}" y2="${y + 6}" stroke="${C.goldSoft}" stroke-width="1.2" opacity="0.8"/>
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M -15 6 L 0 -2 L 15 6 L 15 50 Q 15 54 11 54 L -11 54 Q -15 54 -15 50 Z" fill="${C.label}"/>
    <circle cx="0" cy="8" r="2.6" fill="${C.night}"/>
    <rect x="-9" y="22" width="18" height="2" fill="${C.rule}"/><rect x="-9" y="29" width="13" height="2" fill="${C.rule}"/><rect x="-9" y="36" width="16" height="2" fill="${C.rule}"/>
  </g>`;
}

// Sky clusters: fixed-size groups hung from the top edge, one per side of the
// page, so the centre stays open for content at every width.
export function skyCluster(side) {
  const W = 560,
    H = 260;
  const left = [
    bauble({ cx: 64, cy: 168, r: 38, body: C.post, stringTop: 0 }),
    hangingStamp(158, 0, 46, 50, 62, -6, C.nightRaised),
    bauble({
      cx: 246,
      cy: 104,
      r: 25,
      body: C.ice,
      band: C.paper,
      band2: C.night,
      stringTop: 0,
    }),
    hangingTag(330, 0, 126, 8),
    bauble({
      cx: 414,
      cy: 58,
      r: 17,
      body: C.gold,
      cap: C.goldSoft,
      band: C.post,
      band2: C.paper,
      stringTop: 0,
    }),
    star(206, 196, 7, C.goldSoft),
    star(470, 130, 9, C.goldSoft),
    star(120, 40, 5, C.goldSoft),
  ];
  const right = [
    star(80, 70, 8, C.goldSoft),
    bauble({
      cx: 150,
      cy: 70,
      r: 18,
      body: C.ice,
      band: C.paper,
      band2: C.night,
      stringTop: 0,
    }),
    hangingTag(232, 0, 92, -8),
    hangingStamp(320, 0, 118, 50, 62, 5, C.post),
    bauble({
      cx: 410,
      cy: 112,
      r: 28,
      body: C.gold,
      cap: C.goldSoft,
      band: C.post,
      band2: C.paper,
      stringTop: 0,
    }),
    bauble({ cx: 500, cy: 176, r: 36, body: C.post, stringTop: 0 }),
    star(360, 200, 6, C.goldSoft),
    star(540, 40, 5, C.goldSoft),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${(side === "left" ? left : right).join("\n")}</svg>`;
}

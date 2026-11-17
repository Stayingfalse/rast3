/* eslint-disable @next/next/no-img-element -- rendered by next/og, not the browser */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { BANNER_SIZES, type BannerData, type BannerSize } from "~/server/group-banners";
import { C, fonts, stampDataUri } from "~/server/share-card-image";

/**
 * A group's promotional banners (owner, 17 Nov), drawn like the site: the
 * night sky with its hanging post, the season's stamp, Archivo, and the
 * Christmas Post address label. Same layouts as the approved Sensee set.
 */

/** Drawn at twice the banner's size, so it stays sharp on high-density screens. */
const K = 2;
const u = (n: number) => n * K;

const X = { fontFamily: "ArchivoX", fontWeight: 800 } as const;
const R = (w: 400 | 600 = 400) => ({ fontFamily: "Archivo", fontWeight: w }) as const;

/** next/og draws the space after "." and "," too wide; a no-break space keeps it normal. */
const tight = (t: string) => t.replace(/([.,]) /g, "$1\u00a0");

const svgUri = async (name: string) =>
  `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), "public", "brand", name))).toString("base64")}`;

function Wordmark({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", color: C.frost, fontSize: u(size), lineHeight: 0.95, ...X }}>
      <div style={{ display: "flex" }}>Random Acts</div>
      <div style={{ display: "flex" }}>
        <span style={{ ...R(), marginRight: u(size * 0.25) }}>of</span>
        <span>Santa</span>
      </div>
    </div>
  );
}

/** "Christmas presents, done differently." on one or two lines. */
function Headline({ size, twoLines }: { size: number; twoLines?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: twoLines ? "column" : "row",
        color: C.frost,
        fontSize: u(size),
        lineHeight: 1.04,
        ...X,
      }}
    >
      <div style={{ display: "flex", marginRight: twoLines ? 0 : u(size * 0.28) }}>Christmas presents,</div>
      <div style={{ display: "flex" }}>
        <span style={{ color: C.goldSoft }}>done differently</span>
        <span>.</span>
      </div>
    </div>
  );
}

function Button({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: C.post,
        color: C.paper,
        borderRadius: u(6),
        boxShadow: `0 ${u(2)}px ${u(6)}px rgba(0,0,0,0.25)`,
        ...X,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The airmail band along the label's top edge, as one striped image. */
function airmailUri(width: number) {
  const stripes = Array.from({ length: Math.ceil(width / 8) + 2 }, (_, i) => {
    const x = i * 8 - 6;
    const fill = [C.post, C.paper, C.night, C.paper][i % 4];
    return `<polygon points="${x},6 ${x + 6},0 ${x + 14},0 ${x + 8},6" fill="${fill}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="6" viewBox="0 0 ${width} 6">${stripes}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function Row({ k, v, sub, last, aside }: { k: string; v: string; sub?: string | null; last?: boolean; aside?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        padding: `${u(11)}px 0`,
        borderBottom: last ? "none" : `${u(1)}px solid ${C.rule}`,
      }}
    >
      <div style={{ display: "flex", width: u(112), fontSize: u(11), letterSpacing: u(1), color: C.inkSoft, paddingTop: u(4), ...X }}>
        {k.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", fontSize: u(17), color: C.ink, ...R(600) }}>{v}</div>
        {sub && <div style={{ display: "flex", fontSize: u(13), color: C.inkSoft, marginTop: u(2), ...R() }}>{sub}</div>}
      </div>
      {aside}
    </div>
  );
}

function Postmark({ year }: { year: number }) {
  return (
    <div
      style={{
        flexShrink: 0,
        marginTop: u(-34),
        marginBottom: u(-14),
        width: u(92),
        height: u(92),
        borderRadius: u(46),
        border: `${u(2)}px solid ${C.goldInk}`,
        color: C.goldInk,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-12deg)",
        ...X,
      }}
    >
      <div style={{ display: "flex", fontSize: u(9), letterSpacing: u(1) }}>POSTED</div>
      <div style={{ display: "flex", fontSize: u(18) }}>{String(year)}</div>
      <div style={{ display: "flex", fontSize: u(7), letterSpacing: u(0.5) }}>RAOSANTA.UK</div>
    </div>
  );
}

const ground = (width: number, height: number): React.CSSProperties => ({
  width: u(width),
  height: u(height),
  display: "flex",
  position: "relative",
  overflow: "hidden",
  background: C.night,
  color: C.frost,
});

/** The stamp mark: its artwork is 108×132. */
function Stamp({ src, width }: { src: string; width: number }) {
  return <img src={src} width={u(width)} height={u((width * 132) / 108)} style={{ transform: "rotate(-4deg)" }} alt="" />;
}

async function large(d: BannerData) {
  const [stamp, left, right] = await Promise.all([stampDataUri(d.season), svgUri("sky-left.svg"), svgUri("sky-right.svg")]);
  return (
    <div style={ground(1200, 628)}>
      <img src={left} width={u(560)} height={u(260)} style={{ position: "absolute", left: u(-40), top: 0 }} alt="" />
      <img src={right} width={u(560)} height={u(260)} style={{ position: "absolute", right: u(-40), top: 0 }} alt="" />
      <div
        style={{
          position: "absolute",
          left: u(64),
          top: u(214),
          width: u(660),
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Stamp src={stamp} width={74} />
          <div style={{ display: "flex", marginLeft: u(20) }}>
            <Wordmark size={34} />
          </div>
        </div>
        <div style={{ display: "flex", marginTop: u(26) }}>
          <Headline size={46} twoLines />
        </div>
        <div style={{ display: "flex", width: u(600), marginTop: u(14), fontSize: u(19), lineHeight: 1.5, color: C.frostSoft, ...R() }}>
          {tight(`Share your Amazon wishlist, pick up a ${d.person}'s whenever you're ready and send them something anonymously. No draw, no addresses.`)}
        </div>
        <Button style={{ height: u(56), padding: `0 ${u(26)}px`, fontSize: u(19), marginTop: u(24) }}>{`Join at ${d.link}`}</Button>
      </div>
      <div
        style={{
          position: "absolute",
          right: u(64),
          top: u(214),
          width: u(440),
          display: "flex",
          flexDirection: "column",
          background: C.label,
          borderRadius: u(6),
          boxShadow: `0 ${u(6)}px ${u(18)}px rgba(0,0,0,0.28)`,
        }}
      >
        <img
          src={airmailUri(440)}
          width={u(440)}
          height={u(6)}
          style={{ borderTopLeftRadius: u(6), borderTopRightRadius: u(6) }}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column", padding: `${u(14)}px ${u(22)}px ${u(18)}px` }}>
          <div style={{ display: "flex", fontSize: u(13), letterSpacing: u(1.5), color: C.ink, padding: `${u(4)}px 0 ${u(10)}px`, ...X }}>
            CHRISTMAS POST
          </div>
          <Row k="To" v={d.to} />
          <Row k="From" v="Santa" sub={`a ${d.person}, never named`} />
          <Row k="Deliver to" v="Address withheld" sub="sent through their Amazon wishlist" />
          <Row k="Posting" v={d.posting} sub={d.proof} last aside={<Postmark year={d.season} />} />
        </div>
      </div>
    </div>
  );
}

async function leaderboard(d: BannerData) {
  const stamp = await stampDataUri(d.season);
  return (
    <div style={{ ...ground(728, 90), alignItems: "center", padding: `0 ${u(14)}px 0 ${u(18)}px` }}>
      <Stamp src={stamp} width={44} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: u(14) }}>
        <Headline size={19} />
        <div style={{ display: "flex", marginTop: u(5), fontSize: u(12.5), color: C.frostSoft, ...R() }}>
          {tight(`Share a wishlist, gift ${d.people} anonymously. No draw, no addresses.`)}
        </div>
      </div>
      <Button style={{ height: u(44), padding: `0 ${u(14)}px`, fontSize: u(12), lineHeight: 1.15 }}>
        <div style={{ display: "flex" }}>{d.cta}</div>
        <div style={{ display: "flex", fontSize: u(11), opacity: 0.9, ...R(600) }}>{d.link}</div>
      </Button>
    </div>
  );
}

async function rectangle(d: BannerData) {
  const [stamp, right] = await Promise.all([stampDataUri(d.season), svgUri("sky-right.svg")]);
  return (
    <div style={{ ...ground(300, 250), flexDirection: "column", padding: u(18) }}>
      <img src={right} width={u(300)} height={u(139)} style={{ position: "absolute", right: u(-150), top: u(-18), opacity: 0.9 }} alt="" />
      <div style={{ display: "flex", alignItems: "center" }}>
        <Stamp src={stamp} width={36} />
        <div style={{ display: "flex", marginLeft: u(10) }}>
          <Wordmark size={16} />
        </div>
      </div>
      <div style={{ display: "flex", marginTop: u(14) }}>
        <Headline size={19} twoLines />
      </div>
      <div style={{ display: "flex", marginTop: u(7), fontSize: u(12.5), lineHeight: 1.4, color: C.frostSoft, ...R() }}>
        {tight(`Share your wishlist and gift ${d.people} anonymously. ${d.postingShort}.`)}
      </div>
      <Button
        style={{
          position: "absolute",
          left: u(18),
          right: u(18),
          bottom: u(16),
          height: u(46),
          alignItems: "center",
          fontSize: u(13),
          lineHeight: 1.15,
        }}
      >
        <div style={{ display: "flex" }}>{d.cta}</div>
        <div style={{ display: "flex", fontSize: u(11), opacity: 0.9, ...R(600) }}>{d.link}</div>
      </Button>
    </div>
  );
}

async function mobile(d: BannerData) {
  const stamp = await stampDataUri(d.season);
  return (
    <div style={{ ...ground(320, 100), alignItems: "center", padding: `0 ${u(12)}px` }}>
      <Stamp src={stamp} width={34} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "flex-start", marginLeft: u(10) }}>
        <Headline size={15} twoLines />
        <Button style={{ height: u(28), padding: `0 ${u(10)}px`, fontSize: u(10.5), marginTop: u(7) }}>{d.link}</Button>
      </div>
    </div>
  );
}

const LAYOUTS: Record<BannerSize, (d: BannerData) => Promise<React.ReactElement>> = {
  "1200x628": large,
  "728x90": leaderboard,
  "300x250": rectangle,
  "320x100": mobile,
};

/** The banner as a PNG at twice its nominal size. */
export async function renderBanner(size: BannerSize, d: BannerData) {
  const { width, height } = BANNER_SIZES[size];
  return new ImageResponse(await LAYOUTS[size](d), { width: u(width), height: u(height), fonts: await fonts() });
}

/* eslint-disable @next/next/no-img-element -- rendered by next/og, not the browser */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import type { PublicShareCard } from "~/server/share-cards";
import { readFromE2 } from "~/server/utils/e2-upload";

const C = {
  night: "#13264d",
  frost: "#e6ecf7",
  frostSoft: "#aebbd4",
  label: "#f6f0e2",
  labelShade: "#ebe2cd",
  rule: "#cdbf9f",
  ink: "#18223a",
  inkSoft: "#4b5670",
  post: "#b8262c",
  gold: "#caa24c",
  goldSoft: "#e5cf98",
  paper: "#fffdf8",
};

const pub = (...p: string[]) => join(process.cwd(), "public", ...p);

async function fonts() {
  const [x800, r400, r600] = await Promise.all([
    readFile(pub("fonts", "archivo-expanded-800.ttf")),
    readFile(pub("fonts", "archivo-400.ttf")),
    readFile(pub("fonts", "archivo-600.ttf")),
  ]);
  return [
    {
      name: "ArchivoX",
      data: x800,
      weight: 800 as const,
      style: "normal" as const,
    },
    {
      name: "Archivo",
      data: r400,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Archivo",
      data: r600,
      weight: 600 as const,
      style: "normal" as const,
    },
  ];
}

async function stampDataUri(season: number) {
  const svg = await readFile(pub("brand", "stamps", `${season}.svg`)).catch(
    () => readFile(pub("brand", "stamp.svg")),
  );
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

/** First photo of a thank-you, shrunk to a JPEG data URI; null if none. */
async function photoDataUri(url: string | undefined) {
  if (!url) return null;
  const raw = await readFromE2(url);
  if (!raw) return null;
  const jpeg = await sharp(raw)
    .rotate()
    .resize(720, 720, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer()
    .catch(() => null);
  return jpeg ? `data:image/jpeg;base64,${jpeg.toString("base64")}` : null;
}

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

function Airmail() {
  const colours = [C.post, C.label, C.night, C.label];
  return (
    <div
      style={{ display: "flex", height: 12, width: "100%", overflow: "hidden" }}
    >
      {Array.from({ length: 96 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 12,
            flexShrink: 0,
            background: colours[i % 4],
            transform: "skewX(-45deg)",
          }}
        />
      ))}
    </div>
  );
}

function Postmark({ text, year }: { text: string; year: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 160,
        height: 160,
        borderRadius: 80,
        border: `4px solid ${C.gold}`,
        color: C.gold,
        transform: "rotate(-12deg)",
      }}
    >
      <div style={{ fontFamily: "ArchivoX", fontSize: 30, letterSpacing: 2 }}>
        {text}
      </div>
      <div
        style={{
          fontFamily: "ArchivoX",
          fontSize: 22,
          letterSpacing: 3,
          marginTop: 2,
        }}
      >
        {String(year)}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        width: "100%",
      }}
    >
      <div style={{ fontFamily: "ArchivoX", fontSize: 30, color: C.frost }}>
        Random Acts of Santa
      </div>
      <div
        style={{
          fontFamily: "Archivo",
          fontWeight: 600,
          fontSize: 26,
          color: C.frostSoft,
        }}
      >
        raosanta.uk
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        borderTop: `1px solid ${C.rule}`,
        padding: "16px 0",
      }}
    >
      <div
        style={{
          width: 210,
          fontFamily: "ArchivoX",
          fontSize: 18,
          letterSpacing: 2,
          color: C.inkSoft,
          paddingTop: 6,
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: "Archivo",
          fontWeight: 600,
          fontSize: 32,
          color: C.ink,
        }}
      >
        {v}
      </div>
    </div>
  );
}

export async function renderShareCardImage(card: PublicShareCard) {
  const [fontList, stamp] = await Promise.all([
    fonts(),
    stampDataUri(card.season),
  ]);
  const photo =
    card.kind === "thanks" ? await photoDataUri(card.images[0]) : null;

  if (card.kind === "team" && card.group) {
    const g = card.group;
    const tiles = [
      { k: "GIFTS SENT", v: g.gifts },
      { k: "THANK-YOUS", v: g.thanks },
      { k: "TAKING PART", v: g.members },
    ].filter((t): t is { k: string; v: string } => t.v !== null);
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          background: C.night,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 40,
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontFamily: "ArchivoX",
                fontSize: 52,
                lineHeight: 1.1,
                color: C.frost,
              }}
            >
              {[
                ...clip(g.label, 40)
                  .split(/\s+/)
                  .map((w) => ({ w, gold: true })),
                ...`sent ${g.gifts} random acts of kindness this Christmas`
                  .split(" ")
                  .map((w) => ({ w, gold: false })),
              ].map(({ w, gold }, i) => (
                <span
                  key={i}
                  style={{
                    color: gold ? C.goldSoft : C.frost,
                    marginRight: 15,
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              position: "relative",
              width: 230,
              height: 250,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={stamp}
              width={150}
              height={183}
              style={{ transform: "rotate(-6deg)" }}
              alt=""
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                right: -18,
                bottom: -16,
              }}
            >
              <Postmark text="SENT" year={card.season} />
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: "auto",
            marginBottom: 36,
          }}
        >
          {tiles.map((t) => (
            <div
              key={t.k}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 300,
                background: C.label,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Airmail />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "18px 26px 22px",
                }}
              >
                <div
                  style={{
                    fontFamily: "ArchivoX",
                    fontSize: 18,
                    letterSpacing: 2,
                    color: C.inkSoft,
                  }}
                >
                  {t.k}
                </div>
                <div
                  style={{
                    fontFamily: "ArchivoX",
                    fontSize: 56,
                    color: C.ink,
                    marginTop: 6,
                  }}
                >
                  {t.v}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Footer />
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: fontList,
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      },
    );
  }

  const body =
    card.kind === "sent" ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          background: C.night,
        }}
      >
        <div
          style={{
            fontFamily: "ArchivoX",
            fontSize: 54,
            lineHeight: 1.05,
            color: C.frost,
            maxWidth: 820,
          }}
        >
          I just sent a random act of kindness
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
            marginTop: 36,
            flexGrow: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 700,
              background: C.label,
              borderRadius: 8,
              overflow: "hidden",
              transform: "rotate(-1deg)",
            }}
          >
            <Airmail />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "8px 32px 12px",
              }}
            >
              <Row k="TO" v="A colleague" />
              <Row k="FROM" v="Santa" />
              <Row k="ADDRESS" v="Withheld" />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              position: "relative",
              width: 300,
              height: 300,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={stamp}
              width={190}
              height={232}
              style={{ transform: "rotate(-6deg)" }}
              alt=""
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                right: -10,
                bottom: -10,
              }}
            >
              <Postmark text="SENT" year={card.season} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "48px 64px",
          background: C.night,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 44,
            flexGrow: 1,
            alignItems: "center",
          }}
        >
          {photo && (
            <div
              style={{
                display: "flex",
                padding: 14,
                background: C.paper,
                transform: "rotate(-2deg)",
                borderRadius: 4,
              }}
            >
              <img
                src={photo}
                width={420}
                height={420}
                style={{ objectFit: "cover" }}
                alt=""
              />
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              flexBasis: 0,
              background: C.label,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Airmail />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "28px 36px 30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontFamily: "ArchivoX",
                    fontSize: 34,
                    color: C.ink,
                    maxWidth: photo ? 360 : 760,
                  }}
                >
                  A thank-you for a random act of kindness
                </div>
                <img
                  src={stamp}
                  width={82}
                  height={100}
                  style={{ transform: "rotate(4deg)" }}
                  alt=""
                />
              </div>
              <div
                style={{
                  fontFamily: "Archivo",
                  fontSize: photo
                    ? 30
                    : (card.message ?? "").length <= 90
                      ? 50
                      : 38,
                  lineHeight: 1.35,
                  color: C.ink,
                  marginTop: 20,
                }}
              >
                {`“${clip(card.message ?? "", photo ? 170 : 260)}”`}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 28 }}>
          <Footer />
        </div>
      </div>
    );

  return new ImageResponse(body, {
    width: 1200,
    height: 630,
    fonts: fontList,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}

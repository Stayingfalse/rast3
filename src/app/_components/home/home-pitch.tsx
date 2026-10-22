"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import type { PublicTotals } from "~/server/public-stats";
import type { SeasonPhase } from "~/server/season";
import { JoinButton } from "../post/join-button";
import { ParcelLabel } from "../post/parcel-label";
import { Wordmark } from "../post/wordmark";
import { PERSONAS, PITCH, type Persona } from "./personas";
import { Reveal } from "./reveal";

export type HomeSeason = { year: number; phase: SeasonPhase; opens: string; closes: string };

const TILT = ["-2deg", "1.5deg", "-1deg", "2deg"];

/**
 * The stamp rack (owner, 22 Oct 2026): the visitor presses the rubber stamp
 * that fits them, the parcel label is re-addressed and franked, and the
 * pitch below re-prints for them. ?for= in the address picks one up front,
 * so organisers can share the pitch that fits their people.
 */
export function HomePitch({
  initial,
  totals,
  season,
}: {
  initial: Persona;
  totals: PublicTotals;
  season: HomeSeason;
}) {
  const [persona, setPersona] = useState<Persona>(initial);
  const [pressed, setPressed] = useState(0);
  const stamps = useRef<(HTMLButtonElement | null)[]>([]);
  const p = PITCH[persona];

  const choose = (next: Persona) => {
    setPersona(next);
    setPressed((n) => n + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("for", next);
    window.history.replaceState(null, "", url);
  };

  // a radio group: arrow keys move between stamps
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const j = (i + step + PERSONAS.length) % PERSONAS.length;
    choose(PERSONAS[j]!);
    stamps.current[j]?.focus();
  };

  const posting =
    season.phase === "before"
      ? { value: `Opens ${season.opens}`, hint: "Get your wishlist ready now" }
      : season.phase === "open"
        ? { value: `Open until ${season.closes}`, hint: "Pick up a wishlist any time" }
        : { value: "Closed until next November", hint: "See you next Christmas" };

  return (
    <div className="flex w-full flex-col gap-24">
      <section className="grid w-full items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="flex flex-col items-start gap-7">
          <Wordmark asHeading />
          <p className="font-expanded text-frost max-w-xl text-2xl leading-tight font-bold text-balance sm:text-3xl">
            Anonymous Christmas gifts for your team, your server or your
            friends. No addresses. No draw.
          </p>

          <div id="who" className="flex w-full max-w-xl scroll-mt-24 flex-col gap-3">
            <h2 id="who-heading" className="text-frost-soft text-base">
              Who&apos;s posting? Press the stamp that fits.
            </h2>
            <div
              role="radiogroup"
              aria-labelledby="who-heading"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {PERSONAS.map((key, i) => {
                const on = key === persona;
                return (
                  <button
                    key={key}
                    ref={(el) => {
                      stamps.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => choose(key)}
                    onKeyDown={(e) => onKey(e, i)}
                    style={{ ["--tilt" as string]: TILT[i] }}
                    className={`rounded-label font-expanded flex min-h-20 flex-col items-center justify-center border-[3px] border-double px-2 py-3 text-center leading-tight font-extrabold uppercase transition-colors duration-150 [transform:rotate(var(--tilt))] ${
                      on
                        ? `bg-label border-post text-post shadow-[0_10px_24px_-12px_rgb(4_10_26/0.6)] ${pressed ? "animate-press" : ""}`
                        : "border-frost/35 text-frost-soft hover:border-frost hover:text-frost"
                    }`}
                    // re-run the press each time this stamp is chosen
                    data-press={on ? pressed : undefined}
                  >
                    <span className="text-[0.6875rem] tracking-[0.08em]">{PITCH[key].stamp[0]}</span>
                    <span className="text-sm tracking-[0.04em]">{PITCH[key].stamp[1]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <JoinButton label={p.cta} />
              <a href="#pitch" className="btn-quiet text-frost">
                How it works
              </a>
            </div>
            {season.phase !== "after" && (
              <p className="text-frost-soft text-sm">
                Been before? <JoinButton label="Sign in" variant="link" /> and
                check in for Christmas {season.year} so your wishlist is handed
                out.
              </p>
            )}
          </div>
          {totals.members && (
            <p className="text-frost-soft text-sm">
              <span className="tabular text-frost font-semibold">{totals.members}</span>{" "}
              members have shared a wishlist
              {totals.kudos && (
                <>
                  {" "}
                  ·{" "}
                  <span className="tabular text-frost font-semibold">{totals.kudos}</span>{" "}
                  thank-yous posted
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex justify-center lg:justify-end lg:pt-6">
          <ParcelLabel gifts={totals.gifts} posting={posting} to={p.to} mark={p.mark} />
        </div>
      </section>

      <div id="pitch" key={persona} className={`flex scroll-mt-24 flex-col gap-24 ${pressed ? "animate-reprint" : ""}`}>
        <Reveal as="section" aria-labelledby="pitch-heading" className="flex flex-col gap-10">
          <div className="flex max-w-3xl flex-col gap-4">
            <h2
              id="pitch-heading"
              className="font-expanded text-frost text-3xl leading-[1.05] font-extrabold text-balance sm:text-4xl"
            >
              {p.headline}
            </h2>
            <p className="text-frost-soft max-w-2xl text-lg leading-relaxed text-pretty">{p.intro}</p>
          </div>
          <div className="label-stock overflow-hidden">
            <div className="airmail h-2.5" aria-hidden />
            <dl className="divide-rule grid divide-y px-6 sm:px-10">
              {p.worries.map((w) => (
                <div key={w.q} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8">
                  <dt className="font-expanded text-ink text-lg leading-snug font-bold">{w.q}</dt>
                  <dd className="text-ink-soft leading-relaxed">{w.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal as="section" aria-labelledby="route-heading">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="route-heading"
              className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase sm:text-4xl"
            >
              Four stops <span className="text-gold-soft">to doorstep</span>
            </h2>
            <p className="text-frost-soft max-w-sm">All from your phone, in a couple of minutes.</p>
          </div>
          <div className="relative">
            <div aria-hidden className="route-line bg-frost/25 absolute inset-x-0 top-0 h-px" />
            <ol className="grid md:grid-cols-4">
              {p.steps.map((s, i) => (
                <li
                  key={s.title}
                  style={{ ["--i" as string]: i }}
                  className={`route-station border-frost/25 relative flex flex-col gap-3 border-b py-6 md:border-b-0 md:py-8 ${
                    i > 0 ? "md:border-l md:pl-6" : ""
                  } md:pr-6`}
                >
                  <span
                    aria-hidden
                    className="bg-gold absolute -top-[5px] left-0 h-2.5 w-2.5 rounded-full md:left-auto"
                    style={i > 0 ? { left: "-5px" } : undefined}
                  />
                  <span className="tabular font-expanded text-gold text-sm font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-expanded text-frost text-xl font-bold">{s.title}</h3>
                  <p className="text-frost-soft leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <JoinButton label={p.cta} />
            <a href="#who" className="text-frost-soft underline underline-offset-4">
              Not you? Pick another stamp
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import type { PublicTotals } from "~/server/public-stats";
import type { SeasonPhase } from "~/server/season";
import { JoinButton } from "../post/join-button";
import { ParcelLabel } from "../post/parcel-label";
import { Postmark } from "../post/postmark";
import { Wordmark } from "../post/wordmark";
import {
  KIND_MARK,
  KIND_STAMP,
  KINDS,
  PITCH,
  ROLE_STAMP,
  ROLES,
  type Kind,
  type Persona,
  type Role,
  type Topic,
} from "./personas";
import { Reveal } from "./reveal";

export type HomeSeason = { year: number; phase: SeasonPhase; opens: string; closes: string };

/**
 * A row of rubber stamps that behaves as a radio group: one is pressed,
 * arrow keys move along the row.
 */
function StampRow<T extends string>({
  label,
  options,
  value,
  onChange,
  face,
  pressed,
  small = false,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  face: (v: T) => [string, string] | string;
  pressed: number;
  small?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const j = (i + step + options.length) % options.length;
    onChange(options[j]!);
    refs.current[j]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-2.5 sm:gap-3 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {options.map((o, i) => {
        const on = o === value;
        const text = face(o);
        return (
          <button
            key={o}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={typeof text === "string" ? text : text.join(" ")}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o)}
            onKeyDown={(e) => onKey(e, i)}
            style={{ ["--tilt" as string]: `${(i % 2 ? 1.5 : -1.5) * (small ? 0.6 : 1)}deg` }}
            className={`rounded-label font-expanded flex flex-col items-center justify-center border-[3px] border-double px-1.5 text-center sm:px-2 leading-tight font-extrabold uppercase transition-colors duration-150 [transform:rotate(var(--tilt))] ${
              small ? "min-h-12 py-2 text-xs tracking-[0.04em]" : "min-h-[4.5rem] py-3"
            } ${
              on
                ? `bg-label border-post text-post shadow-[0_10px_24px_-12px_rgb(4_10_26/0.6)] ${pressed ? "animate-press" : ""}`
                : "border-frost/35 text-frost-soft hover:border-frost hover:text-frost"
            }`}
          >
            {typeof text === "string" ? (
              text
            ) : (
              <>
                <span className="text-[0.625rem] tracking-[0.06em] sm:text-[0.6875rem] sm:tracking-[0.08em]">
                  {text[0]}
                </span>
                <span className="text-xs tracking-[0.01em] sm:text-sm sm:tracking-[0.04em]">{text[1]}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The stamp rack (owner, 22 Oct 2026): the visitor presses the stamps that
 * fit them (which group, and whether they're organising it or invited), the
 * parcel label is re-addressed and franked, and the pitch below re-prints for
 * them. ?for= in the address picks one up front, so organisers can share the
 * pitch that fits their people.
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
  const [kind, role] = persona.split("-") as [Kind, Role];
  const p = PITCH[persona];

  const choose = (next: Persona) => {
    if (next === persona) return;
    setPersona(next);
    setPressed((n) => n + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("for", next);
    window.history.replaceState(null, "", url);
  };

  const posting =
    season.phase === "before"
      ? { value: `Opens ${season.opens}`, hint: "Get your wishlist ready now" }
      : season.phase === "open"
        ? { value: `Open until ${season.closes}`, hint: "Pick up a wishlist any time" }
        : { value: "Closed until next November", hint: "See you next Christmas" };

  // the same answers for everyone, minus what this pitch already said
  const answered = new Set(p.worries.map((w) => w.topic).filter(Boolean) as Topic[]);
  const smallPrint = ([
    {
      topic: "address",
      q: "Is my address private?",
      a: "Yes. Santas only see your Amazon wishlist, and Amazon delivers to your gift address without showing it. We never ask for it.",
    },
    {
      topic: "money",
      q: "Do I have to spend money?",
      a: "No. You can share a wishlist and never gift anyone. Gifts are whatever you choose, with no minimum and no ranking.",
    },
    {
      topic: "secret-santa",
      q: "Is this Secret Santa?",
      a: "Not quite. There's no sign-up deadline, no draw and no fixed match. You pick up random wishlists when it suits you, so anyone can join late and nobody is stuck with one name.",
    },
    {
      topic: "dates",
      q: "When does it run?",
      a: `Christmas only. Gifting opens on ${season.opens} and closes on ${season.closes}. Returning members check in each year to confirm their wishlist.`,
    },
    {
      topic: "who",
      q: "Who can join?",
      a: "Anyone with an Amazon UK wishlist, through their workplace, a Discord community or a friends group. We check each new group before it opens for gifting.",
    },
    {
      topic: "free",
      q: "Is it free?",
      a: "Yes. In some groups wishlists open through an Amazon affiliate link, which pays the site a small commission at no extra cost to you.",
    },
  ] satisfies { topic: Topic; q: string; a: string }[]).filter((item) => !answered.has(item.topic));

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
            <h2 className="text-frost-soft text-base">Who&apos;s posting? Press the stamps that fit.</h2>
            <StampRow
              label="Which group"
              options={KINDS}
              value={kind}
              onChange={(k) => choose(`${k}-${role}`)}
              face={(k) => KIND_STAMP[k]}
              pressed={pressed}
            />
            <StampRow
              label="Organising or invited"
              options={ROLES}
              value={role}
              onChange={(r) => choose(`${kind}-${r}`)}
              face={(r) => ROLE_STAMP[r]}
              pressed={pressed}
              small
            />
          </div>

          {/* phones: the label is below the fold, so the press lands here */}
          <div
            aria-live="polite"
            className="label-stock relative w-full max-w-xl overflow-hidden lg:hidden"
          >
            <div className="airmail h-2" aria-hidden />
            <dl className="divide-rule grid divide-y px-4 pr-[5.5rem]">
              <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2.5">
                <dt className="label-caps text-ink-soft pt-0.5">To</dt>
                <dd className="text-ink text-sm leading-snug font-semibold">{p.to}</dd>
              </div>
              <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2.5">
                <dt className="label-caps text-ink-soft pt-0.5">Address</dt>
                <dd className="text-ink text-sm leading-snug font-semibold">Withheld</dd>
              </div>
            </dl>
            <Postmark
              key={persona}
              centre="2026"
              bottom={KIND_MARK[kind]}
              animate={pressed > 0}
              className="text-gold-ink pointer-events-none absolute top-4 right-1 w-[4.5rem]"
            />
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
          <ParcelLabel gifts={totals.gifts} posting={posting} to={p.to} mark={KIND_MARK[kind]} />
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
                    className={`bg-gold absolute -top-[5px] left-0 h-2.5 w-2.5 rounded-full ${i > 0 ? "md:-left-[5px]" : ""}`}
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
              Not you? Press different stamps
            </a>
          </div>
        </Reveal>

        <Reveal as="section" aria-labelledby="small-print-heading" className="label-stock overflow-hidden">
          <div className="airmail h-2.5" aria-hidden />
          <div className="flex flex-col gap-6 p-6 sm:p-10">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
              <h2
                id="small-print-heading"
                className="font-expanded text-ink text-2xl leading-tight font-extrabold uppercase"
              >
                The small print
              </h2>
              <p className="text-ink-soft">Short, because there isn&apos;t much of it.</p>
            </div>
            <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {smallPrint.map((item) => (
                <div key={item.q} className="border-rule border-t py-5">
                  <dt className="text-ink font-bold">{item.q}</dt>
                  <dd className="text-ink-soft mt-2 leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

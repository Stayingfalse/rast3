import type { PublicTotals } from "~/server/public-stats";
import type { SeasonPhase } from "~/server/season";

import { JoinButton } from "./post/join-button";
import { ParcelLabel } from "./post/parcel-label";
import { Wordmark } from "./post/wordmark";

export type HeroSeason = { year: number; phase: SeasonPhase; opens: string; closes: string };

export function HomeHero({ totals, season }: { totals: PublicTotals; season: HeroSeason }) {
  const posting =
    season.phase === "before"
      ? { value: `Opens ${season.opens}`, hint: "Get your wishlist ready now" }
      : season.phase === "open"
        ? { value: `Open until ${season.closes}`, hint: "Pick up a wishlist any time" }
        : { value: "Closed until next November", hint: "See you next Christmas" };
  return (
    <section className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
      <div className="flex flex-col items-start gap-7 sm:gap-8">
        <Wordmark asHeading />
        <div className="flex max-w-xl flex-col gap-4">
          <p className="font-expanded text-frost text-2xl leading-tight font-bold text-balance sm:text-3xl">
            Send someone a Christmas gift without ever knowing their address.
          </p>
          <p className="text-frost-soft text-base leading-relaxed text-pretty sm:text-lg">
            Share your Amazon wishlist with your workplace, your community or
            your friends. Whenever you&apos;re ready, pick up someone&apos;s
            list and send what you like. No draw, no pressure, and every
            address stays private.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <JoinButton />
            <a href="#how-it-works" className="btn-quiet text-frost">
              How it works
            </a>
          </div>
          {season.phase !== "after" && (
            <p className="text-frost-soft text-sm">
              Been before? Sign in and check in for Christmas {season.year},
              so your list is handed out.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-8 lg:items-end">
        <ParcelLabel gifts={totals.gifts} posting={posting} />
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
    </section>
  );
}

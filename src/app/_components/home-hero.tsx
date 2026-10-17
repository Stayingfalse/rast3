import type { PublicTotals } from "~/server/public-stats";

import { JoinButton } from "./post/join-button";
import { ParcelLabel } from "./post/parcel-label";
import { Wordmark } from "./post/wordmark";

export function HomeHero({ totals }: { totals: PublicTotals }) {
  return (
    <section className="grid w-full items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
      <div className="flex flex-col items-start gap-8">
        <Wordmark asHeading />
        <div className="max-w-xl space-y-4">
          <p className="font-expanded text-frost text-2xl leading-tight font-bold text-balance sm:text-3xl">
            Send a colleague a Christmas gift without ever knowing their
            address.
          </p>
          <p className="text-frost-soft text-lg leading-relaxed text-pretty">
            Share your Amazon wishlist. Whenever you&apos;re ready, pick up a
            few of theirs and gift what you like. No draw, no pressure, and
            every address stays private.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <JoinButton />
          <a href="#how-it-works" className="btn-quiet text-frost">
            How it works
          </a>
        </div>
        {totals.members && (
          <p className="text-frost-soft text-sm">
            <span className="tabular text-frost font-semibold">
              {totals.members}
            </span>{" "}
            members have shared a wishlist
            {totals.kudos && (
              <>
                {" "}
                ·{" "}
                <span className="tabular text-frost font-semibold">
                  {totals.kudos}
                </span>{" "}
                thank-yous posted
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex justify-center lg:justify-end">
        <ParcelLabel gifts={totals.gifts} />
      </div>
    </section>
  );
}

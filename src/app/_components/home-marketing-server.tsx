import type { HomeSeason } from "./home/home-pitch";
import { Reveal } from "./home/reveal";
import { JoinButton } from "./post/join-button";

/**
 * Below the stamp rack's pitch (which carries its own small print): the
 * closing call, the same for every visitor, following the season.
 */
export default function HomeMarketingServer({ season }: { season: HomeSeason }) {
  const closing =
    season.phase === "before"
      ? {
          heading: `Gifting opens on ${season.opens}.`,
          body: "Get your wishlist ready now and be first in the post.",
        }
      : season.phase === "open"
        ? {
            heading: `Gifting is open until ${season.closes}.`,
            body: "Join, pick up a wishlist and send something this week.",
          }
        : {
            heading: "Gifting has closed for this Christmas.",
            body: "Join now and we'll email you when it opens next November.",
          };

  return (
    <div id="home-marketing" className="flex w-full flex-col gap-24">
      <Reveal
        as="section"
        aria-labelledby="closing-heading"
        className="border-frost/25 flex flex-col items-start gap-6 border-y py-12 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="max-w-xl">
          <h2
            id="closing-heading"
            className="font-expanded text-frost text-2xl leading-tight font-extrabold text-balance sm:text-3xl"
          >
            {closing.heading}
          </h2>
          <p className="text-frost-soft mt-2">{closing.body}</p>
        </div>
        <JoinButton label="Join Random Acts of Santa" />
      </Reveal>
    </div>
  );
}

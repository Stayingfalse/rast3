import type { HomeSeason } from "./home/home-pitch";
import { Reveal } from "./home/reveal";
import { JoinButton } from "./post/join-button";

/**
 * Below the stamp rack's pitch: the small print and the closing call, the
 * same for every visitor.
 */
export default function HomeMarketingServer({ season }: { season: HomeSeason }) {
  const smallPrint = [
    {
      q: "Is my address private?",
      a: "Yes. Santas only see your Amazon wishlist, and Amazon delivers to your gift address without showing it. We never ask for it.",
    },
    {
      q: "Do I have to spend money?",
      a: "No. You can share a wishlist and never gift anyone. Gifts are whatever you choose, with no minimum and no ranking.",
    },
    {
      q: "Is this Secret Santa?",
      a: "Not quite. There's no sign-up deadline, no draw and no fixed match. You pick up random wishlists when it suits you, so anyone can join late and nobody is stuck with one name.",
    },
    {
      q: "When does it run?",
      a: `Christmas only. Gifting opens on ${season.opens} and closes on ${season.closes}. Returning members check in each year to confirm their wishlist.`,
    },
    {
      q: "Who can join?",
      a: "Anyone with an Amazon UK wishlist, through their workplace, a Discord community or a friends group. We check each new group before it opens for gifting.",
    },
    {
      q: "Is it free?",
      a: "Yes. In some groups wishlists open through an Amazon affiliate link, which pays the site a small commission at no extra cost to you.",
    },
  ];

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
        aria-labelledby="small-print-heading"
        className="label-stock overflow-hidden"
      >
        <div className="airmail h-2.5" aria-hidden />
        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <h2
              id="small-print-heading"
              className="font-expanded text-ink text-2xl leading-tight font-extrabold uppercase"
            >
              The small print
            </h2>
            <p className="text-ink-soft">
              Short, because there isn&apos;t much of it.
            </p>
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

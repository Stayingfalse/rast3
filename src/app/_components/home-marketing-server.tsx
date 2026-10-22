import type { HeroSeason } from "./home-hero";
import { JoinButton } from "./post/join-button";

/**
 * The three kinds of group (owner, 22 Oct: lead with everyone, three doors).
 * Facts as built: workplaces join by work email (optional join code),
 * communities through a linked Discord server (optional role), friends by
 * invite; every new group is approved by a site admin.
 */
const DOORS = [
  {
    kind: "Workplace",
    title: "Your organisation",
    body: "Colleagues join with their work email and start with wishlists from their own team, then the whole organisation. Anyone can start theirs; organisers can require a join code too.",
    via: "Your work email",
  },
  {
    kind: "Community",
    title: "Your Discord server",
    body: "For communities whose members don't share an email address. An organiser links the server, and members join through Discord, optionally only with a set role.",
    via: "Discord",
  },
  {
    kind: "Friends",
    title: "Your friends or family",
    body: "Start a group in a minute and share its invite link or code. Small and personal, with everyone's address still private.",
    via: "An invite link",
  },
];

const STATIONS = [
  {
    no: "01",
    title: "Share your wishlist",
    body: "Sign in, add your Amazon UK wishlist and join your workplace, community or friends. Amazon keeps your address; nobody here ever sees it.",
  },
  {
    no: "02",
    title: "Pick some up",
    body: "Whenever you're ready, pick up a random wishlist or a few. Lists with the fewest gifts come first, so nobody is left out, and you hold up to five at a time.",
  },
  {
    no: "03",
    title: "Post a gift",
    body: "Buy whatever suits your budget from their list, sent to their Amazon gift address, and mark it Gifted. Gift one or several; giving is always optional.",
  },
  {
    no: "04",
    title: "Say thank you",
    body: "When a parcel arrives, post a thank-you postcard. Your Santa stays anonymous, and every act this season collects your Christmas stamp.",
  },
];

export default function HomeMarketingServer({ season }: { season: HeroSeason }) {
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
      <section
        id="ways-in"
        aria-labelledby="ways-in-heading"
        className="label-stock scroll-mt-24 overflow-hidden"
      >
        <div className="airmail h-2.5" aria-hidden />
        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <h2
              id="ways-in-heading"
              className="font-expanded text-ink text-2xl leading-tight font-extrabold uppercase"
            >
              Three ways in
            </h2>
            <p className="text-ink-soft">Gift within a group you already belong to.</p>
          </div>
          <ul className="grid gap-x-8 lg:grid-cols-3">
            {DOORS.map((d) => (
              <li key={d.kind} className="border-rule flex flex-col gap-3 border-t py-5">
                <h3 className="font-expanded text-ink text-xl leading-tight font-bold">
                  {d.title}
                </h3>
                <p className="text-ink-soft leading-relaxed">{d.body}</p>
                <dl className="border-rule mt-auto grid grid-cols-[6.5rem_1fr] items-baseline gap-x-3 gap-y-2 border-t border-dashed pt-3">
                  <dt className="label-caps text-ink-soft">Group</dt>
                  <dd className="text-ink font-semibold">{d.kind}</dd>
                  <dt className="label-caps text-ink-soft">Join with</dt>
                  <dd className="text-ink font-semibold">{d.via}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <div className="border-rule flex flex-col items-start gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-soft max-w-xl">
              Organising one? Sign in, then start your group from{" "}
              <span className="text-ink font-semibold">Your groups</span>. We
              check each new group before gifting opens.
            </p>
            <JoinButton label="Start a group" variant="quiet" className="text-ink" />
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="route-heading"
        className="scroll-mt-24"
      >
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="route-heading"
            className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase sm:text-4xl"
          >
            From wishlist <span className="text-gold-soft">to doorstep</span>
          </h2>
          <p className="text-frost-soft max-w-sm">
            Four stops, all from your phone. Most people are done in a couple of
            minutes.
          </p>
        </div>
        <ol className="border-frost/25 grid border-t md:grid-cols-4">
          {STATIONS.map((s, i) => (
            <li
              key={s.no}
              className={`border-frost/25 relative flex flex-col gap-3 border-b py-6 md:border-b-0 md:py-8 ${
                i > 0 ? "md:border-l md:pl-6" : ""
              } md:pr-6`}
            >
              <span
                aria-hidden
                className="bg-gold absolute -top-[5px] left-0 h-2.5 w-2.5 rounded-full md:left-auto"
                style={i > 0 ? { left: "-5px" } : undefined}
              />
              <span className="tabular font-expanded text-gold text-sm font-bold">
                {s.no}
              </span>
              <h3 className="font-expanded text-frost text-xl font-bold">
                {s.title}
              </h3>
              <p className="text-frost-soft leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
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
      </section>

      <section
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
      </section>
    </div>
  );
}

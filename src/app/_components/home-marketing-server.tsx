import { JoinButton } from "./post/join-button";

const STATIONS = [
  {
    no: "01",
    title: "Share your wishlist",
    body: "Sign in, pick your organisation and department, and add your Amazon UK wishlist. Amazon keeps your address; nobody here ever sees it.",
  },
  {
    no: "02",
    title: "Pick up three",
    body: "Whenever you're ready, collect three random wishlists from colleagues. The ones nobody has looked at yet come first, so no one is left out.",
  },
  {
    no: "03",
    title: "Post a gift",
    body: "Buy whatever suits your budget from their list and mark it Gifted. Gift one, all three, or ask for more. Giving is always optional.",
  },
  {
    no: "04",
    title: "Say thank you",
    body: "When a parcel arrives, post a kudos note with a photo or two. Your Santa stays anonymous; the thank-you is shared with the team.",
  },
];

const SMALL_PRINT = [
  {
    q: "Is my address private?",
    a: "Yes. Gifters only see your Amazon wishlist, and Amazon delivers without sharing your address. We never ask for it.",
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
    q: "Who can join?",
    a: "Anyone with a verified email at a participating organisation. Support for communities and friend groups is on its way.",
  },
];

export default function HomeMarketingServer() {
  return (
    <div id="home-marketing" className="flex w-full flex-col gap-24">
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
          <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {SMALL_PRINT.map((item) => (
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
            className="font-expanded text-frost text-2xl leading-tight font-extrabold sm:text-3xl"
          >
            The 2026 season opens mid-November.
          </h2>
          <p className="text-frost-soft mt-2">
            Get your wishlist ready now and be first in the post.
          </p>
        </div>
        <JoinButton label="Join Random Acts of Santa" />
      </section>
    </div>
  );
}

import { type Metadata } from "next";
import Link from "next/link";

import { AMAZON_DISCLOSURE } from "~/server/affiliate";

export const metadata: Metadata = {
  title: "Terms · Random Acts of Santa",
  description:
    "The plain-English terms for using Random Acts of Santa: who it's for, how gifting works, being kind, and what we're responsible for.",
};

const LAST_UPDATED = "31 October 2026";
const CONTACT = "privacy@raosanta.uk";
const link = "text-post font-semibold underline underline-offset-4";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-rule border-t pt-6">
      <h2 id={id} className="font-expanded text-ink mb-3 text-xl font-extrabold">
        {title}
      </h2>
      <div className="text-ink max-w-[70ch] space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

/** Day 30: the terms of use, in plain English. */
export default function TermsPage() {
  return (
    <article className="label-stock text-ink w-full max-w-3xl overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-6 p-6 sm:p-10">
        <header>
          <h1 className="font-expanded text-3xl font-extrabold">Terms</h1>
          <p className="text-ink-soft mt-2 text-sm">Last updated {LAST_UPDATED}</p>
          <p className="mt-4 max-w-[70ch] text-lg leading-relaxed">
            Random Acts of Santa is a free way to send Christmas gifts to
            colleagues, communities and friends through their Amazon wishlists,
            without sharing home addresses. By using it you agree to these
            terms. They&apos;re short, and written to be read.
          </p>
        </header>

        <Section id="who" title="Who it's for">
          <p>
            You must be 16 or over. Random Acts of Santa is run by an individual
            in the United Kingdom; you can reach them at{" "}
            <a href={`mailto:${CONTACT}`} className={link}>
              {CONTACT}
            </a>
            .
          </p>
        </Section>

        <Section id="how" title="How it works">
          <p>
            You share your wishlist and, whenever you&apos;re ready, pick up
            other members&apos; lists at random and gift as many or as few as
            you like. There&apos;s no draw and no fixed match. Giving is never
            required, and nobody is promised a gift.
          </p>
          <p>
            Gifts are bought on Amazon, under Amazon&apos;s terms. We never
            take payment, see your address or handle deliveries, so we
            can&apos;t help with orders, returns or refunds: Amazon can.
          </p>
        </Section>

        <Section id="you" title="Your part">
          <ul className="list-disc space-y-2 pl-5">
            <li>Use your real name, and one account.</li>
            <li>
              Keep your wishlist one you&apos;re happy for others in your groups
              to open, with things at a range of prices.
            </li>
            <li>
              Thank-yous and photos must be yours to share, and kind. No
              abuse, nothing offensive, and nobody else&apos;s personal details.
            </li>
            <li>
              Don&apos;t try to find out who a Santa or recipient is, misuse
              other members&apos; information, or interfere with the site.
            </li>
          </ul>
          <p>
            Organisers can remove members from their groups, site admins can
            hide thank-yous, and we can suspend or delete accounts that break
            these terms.
          </p>
        </Section>

        <Section id="groups" title="Groups and organisers">
          <p>
            Workplaces, communities and friends groups are run by their
            organisers, who decide who can join. New groups are checked by a
            site admin before gifting opens in them. Organisers see what our{" "}
            <Link href="/privacy#who-sees" className={link}>
              privacy policy
            </Link>{" "}
            says they see, and nothing more.
          </p>
        </Section>

        <Section id="affiliate" title="Amazon affiliate links">
          <p>
            {AMAZON_DISCLOSURE} The price you pay is the same. More in the{" "}
            <Link href="/privacy#affiliate" className={link}>
              privacy policy
            </Link>
            .
          </p>
        </Section>

        <Section id="service" title="The service">
          <p>
            It runs once a season, around Christmas, and we may change or pause
            it. It&apos;s provided as it is, without guarantees that it&apos;s
            always available or free of mistakes.
          </p>
          <p>
            We aren&apos;t responsible for gifts, wishlists or what other
            members post, or for losses that weren&apos;t foreseeable. Nothing
            in these terms limits anything the law doesn&apos;t allow us to
            limit, such as liability for death or injury caused by negligence,
            or for fraud, and nothing affects your rights as a consumer.
          </p>
        </Section>

        <Section id="ending" title="Leaving">
          <p>
            You can{" "}
            <Link href="/account" className={link}>
              download your data or delete your account
            </Link>{" "}
            at any time. Accounts nobody has signed into for 24 months are
            deleted.
          </p>
        </Section>

        <Section id="changes" title="Changes and law">
          <p>
            If these terms change we&apos;ll update the date above, and tell
            signed-in members on the site about anything significant. These
            terms are governed by the law of England and Wales.
          </p>
          <p>
            <Link href="/" className={link}>
              Back to Random Acts of Santa
            </Link>
          </p>
        </Section>
      </div>
    </article>
  );
}

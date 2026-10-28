import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy · Random Acts of Santa",
  description:
    "What personal data Random Acts of Santa collects, why, who can see it, how long we keep it and your rights under UK data protection law.",
};

const LAST_UPDATED = "28 October 2026";
const CONTACT = "privacy@raosanta.uk";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-rule border-t pt-6">
      <h2
        id={id}
        className="font-expanded text-ink mb-3 text-xl font-extrabold"
      >
        {title}
      </h2>
      <div className="text-ink space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

const Mail = () => (
  <a
    href={`mailto:${CONTACT}`}
    className="text-post font-semibold underline underline-offset-4"
  >
    {CONTACT}
  </a>
);

export default function PrivacyPolicyPage() {
  return (
    <article className="label-stock text-ink w-full max-w-3xl overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-6 p-6 sm:p-10">
        <header>
          <h1 className="font-expanded text-ink text-3xl font-extrabold">
            Privacy policy
          </h1>
          <p className="text-ink-soft mt-2 text-sm">
            Last updated {LAST_UPDATED}
          </p>
          <p className="mt-4 text-lg leading-relaxed">
            Random Acts of Santa lets people send Christmas gifts to colleagues
            and community members through their Amazon wishlists, without anyone
            sharing a home address. This policy explains what personal data we
            use to do that, why, who can see it, how long we keep it and the
            rights you have under UK data protection law (the UK GDPR and the
            Data Protection Act 2018).
          </p>
        </header>

        <Section id="who" title="Who we are">
          <p>
            Random Acts of Santa (raosanta.uk) is run by an individual based in
            the United Kingdom, who is the <strong>data controller</strong> for
            the personal data described here. For anything about your data,
            email <Mail />.
          </p>
        </Section>

        <Section id="what" title="What we collect">
          <p>
            <strong>When you sign in.</strong> Your name, email address and
            profile picture link from the sign-in method you choose (Google,
            Discord, Twitch, GitHub, Reddit or an email link). We also store the
            sign-in tokens that provider gives us, so you stay signed in. We
            never see your password for those services.
          </p>
          <p>
            <strong>If you join a community with Discord.</strong> When you
            ask us to, we check which Discord servers you are in (and, for
            organisers, which ones you manage). We use this only to join or
            link a group, and we don&apos;t keep your server list. We never
            read or post messages.
          </p>
          <p>
            <strong>Your profile.</strong> Your first and last name, your work
            or community email address, the organisation (taken from that email
            address) and department you choose, and the link to your Amazon
            wishlist.
          </p>
          <p>
            <strong>Taking part.</strong> Which wishlists you have picked up,
            which you have marked as gifted (with any note you add), when you
            say a gift to you has arrived, problems you report with a wishlist, and how many times your wishlist has
            been handed out. We never ask for, and never see, your home address:
            Amazon handles delivery.
          </p>
          <p>
            <strong>Thank-yous (kudos).</strong> The message and any photos you
            post, and when you posted them.
          </p>
          <p>
            <strong>Share cards.</strong> If you choose to share a card, we
            store a random link code, what the card is for and how many times
            its page has been viewed.
          </p>
          <p>
            <strong>Technical data.</strong> Our servers keep short-lived logs
            of requests, including your IP address, browser type and the pages
            requested, to keep the site secure and working.
          </p>
        </Section>

        <Section id="why" title="Why we use it, and our lawful basis">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>To run the service you signed up for</strong>: your
              account, matching you with wishlists to pick up, recording gifts,
              your stamp album, and posting and sharing thank-yous. Lawful
              basis: performance of our agreement with you (Article 6(1)(b)).
            </li>
            <li>
              <strong>To let your organisation run its Christmas</strong>:
              organisers of your organisation or department can see your name,
              email, department and whether you have completed your profile, so
              they can manage members and moderate thank-yous. Lawful basis: our
              legitimate interest, and your organisation&apos;s, in running the
              scheme fairly and safely (Article 6(1)(f)).
            </li>
            <li>
              <strong>To keep the site secure</strong>: server logs, preventing
              abuse and fixing faults. Lawful basis: legitimate interests
              (Article 6(1)(f)).
            </li>
            <li>
              <strong>To count wishlist opens</strong>: when you open a
              picked-up wishlist on Amazon, our own server notes that the
              list was opened, which Amazon store it&apos;s on and whether the
              link carried our affiliate tag. No cookies are used and nothing
              is shared with anyone else. Site admins see totals, to know
              which lists get opened and which Amazon stores to join next.
              Lawful basis: legitimate interests (Article 6(1)(f)).
            </li>
            <li>
              <strong>To understand how the site is used</strong>: site
              admins see season totals worked out from what the site already
              holds (how many people checked in, picked up, gifted and said
              thank you, by kind of group and by week). Counts only, never
              about any one person, and nothing extra is collected for it.
              Lawful basis: legitimate interests (Article 6(1)(f)).
            </li>
            <li>
              <strong>To show public totals</strong> such as &ldquo;120+ gifts
              sent&rdquo;. These are counts only, rounded, and never shown when
              under 10, so they do not identify anyone.
            </li>
            <li>
              <strong>To send sign-in links</strong> when you choose to sign in
              by email. Lawful basis: performance of our agreement with you.
            </li>
            <li>
              <strong>To send a few reminder emails</strong> each season: a
              nudge to check in before gifting opens, one when it opens, and,
              a few days after a Santa has sent you something, a check-in if
              you haven&apos;t posted a thank-you yet (never on the day, and
              never saying who). Once you&apos;ve picked up a list, at most
              one a week when new members&apos; wishlists are waiting for a
              first gift. They only go to people who have checked in or
              signed up this Christmas: if you were with us in an earlier year,
              you won&apos;t hear from us until you come back and check in.
              Every one has a link to stop them, and sign-in links still
              arrive. Lawful
              basis: legitimate interests (Article 6(1)(f)), as part of the
              service you signed up for.
            </li>
          </ul>
          <p>
            We do not sell your data, we do not use it for advertising, and we
            do not use automated decision-making or profiling that affects you.
            Wishlists are handed out at random (people whose wishlists have had
            the fewest gifts are offered first), which has no legal or similarly
            significant effect.
          </p>
        </Section>

        <Section id="who-sees" title="Who can see what">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Someone who picks up your wishlist</strong> sees your
              Amazon wishlist link and your department, not your address and not
              who else is buying for you.
            </li>
            <li>
              <strong>Recipients never see who gifted them.</strong> Your gifts
              stay anonymous. A few days after you mark a gift, the person it
              was for sees that a gift was marked and when, never by whom or
              your note, and can tell you it arrived.
            </li>
            <li>
              <strong>Thank-yous you post</strong>, with their photos, are shown
              in the kudos feed to other members, and to visitors on the home
              page. They appear under a random festive name, not your real name.
              Organisers can hide thank-yous that break the rules.
            </li>
            <li>
              <strong>Share cards</strong> are public web pages you choose to
              create. A gift card never shows names, the gift or an address. A
              thank-you card shows your message and photos. Organisation and
              team cards show rounded totals only. Share pages ask search
              engines not to index them.
            </li>
            <li>
              <strong>Organisers</strong> (site, organisation and department
              admins) can see members of their organisation or department as
              described above.
            </li>
          </ul>
        </Section>

        <Section id="processors" title="Who processes data for us">
          <p>
            We use a small number of service providers who process data only on
            our instructions:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Hosting</strong>: the website and its database run on
              servers in the UK or the European Economic Area.
            </li>
            <li>
              <strong>Photo storage</strong>: photos posted with thank-yous are
              stored with iDrive e2 in the UK or the European Economic Area.
            </li>
            <li>
              <strong>Email delivery</strong>: an email service sends sign-in
              links and reminder emails to the address you give.
            </li>
          </ul>
          <p>
            When you sign in with Google, Discord, Twitch, GitHub or Reddit,
            that company handles the sign-in under its own privacy policy. When
            you open a wishlist, you are taken to Amazon, which has its own
            privacy policy. We share data with authorities only where the law
            requires it.
          </p>
        </Section>

        <Section id="transfers" title="International transfers">
          <p>
            We store and process your data in the UK and the European Economic
            Area, which the UK recognises as giving adequate protection. If we
            ever use a provider outside these areas, we will put appropriate
            safeguards in place (such as the UK International Data Transfer
            Agreement) and update this policy first.
          </p>
        </Section>

        <Section id="retention" title="How long we keep it">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Your account and profile</strong>: until you ask us to
              delete them. Membership carries over from one Christmas to the
              next so your stamp album keeps working. Accounts that have not
              been signed into for 24 months are deleted.
            </li>
            <li>
              <strong>
                Gifts, reports, thank-yous, photos and share cards
              </strong>
              : as long as your account exists. Deleting a thank-you or a gift
              record also removes its share card.
            </li>
            <li>
              <strong>Server logs</strong>: up to 30 days.
            </li>
            <li>
              <strong>Sign-in links</strong>: they expire after 24 hours.
            </li>
          </ul>
        </Section>

        <Section id="cookies" title="Cookies">
          <p>
            We use only cookies that are strictly necessary for the site to
            work, so we do not ask for consent to them. We do not use analytics,
            advertising or tracking cookies. (Wishlist opens are counted on our
            own server without any cookie; see how we use your information.)
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <code className="text-sm">next-auth.session-token</code>: keeps
              you signed in (30 days).
            </li>
            <li>
              <code className="text-sm">next-auth.csrf-token</code> and{" "}
              <code className="text-sm">next-auth.callback-url</code>: protect
              and complete sign-in (up to 1 hour).
            </li>
            <li>
              <code className="text-sm">cookie-consent</code>: remembers that
              you have seen our cookie notice (1 year).
            </li>
          </ul>
          <p>
            If you install the site as an app, your browser also stores the
            site&apos;s icons and a few pages so it opens quickly.
          </p>
        </Section>

        <Section id="affiliate" title="Amazon affiliate links">
          <p>
            In some groups, wishlists open from a gift page with an Amazon
            affiliate link. As an Amazon Associate, Random Acts of Santa
            earns from qualifying purchases. The price you pay is the same.
          </p>
          <p>
            We don&apos;t send Amazon your name, email or anything else about
            you. When you follow the link, Amazon may set its own cookies on
            amazon.co.uk under Amazon&apos;s privacy notice. Amazon reports to
            us only totals of clicks and orders for each tracking ID, never
            who bought what. Gift pages show no names, groups or emails.
          </p>
        </Section>

        <Section id="rights" title="Your rights">
          <p>You have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>get a copy of the personal data we hold about you;</li>
            <li>have inaccurate data corrected;</li>
            <li>have your data deleted;</li>
            <li>restrict or object to how we use it;</li>
            <li>
              receive your data in a portable format and have it sent to someone
              else.
            </li>
          </ul>
          <p>
            You can update your profile on the site at any time. For anything
            else, email <Mail />. We will respond within one month. To have a
            thank-you removed, ask your organiser or email us.
          </p>
          <p>
            If you are unhappy with how we have handled your data, please tell
            us first. You also have the right to complain to the Information
            Commissioner&apos;s Office (ICO) at{" "}
            <a
              href="https://ico.org.uk/make-a-complaint/"
              className="text-post font-semibold underline underline-offset-4"
              rel="noopener noreferrer"
              target="_blank"
            >
              ico.org.uk
            </a>{" "}
            or on 0303 123 1113.
          </p>
        </Section>

        <Section id="age" title="Age">
          <p>
            Random Acts of Santa is for people aged 16 and over. If you are
            under 16, please don&apos;t use it. If we learn that someone under
            16 has an account, we will delete it.
          </p>
        </Section>

        <Section id="security" title="Keeping your data safe">
          <p>
            The site is only served over HTTPS. Sign-in sessions are stored on
            our server, not in your browser. Access to the database and photo
            storage is restricted to the person who runs the service. No system
            is perfectly secure, but if a breach affecting your data happens we
            will tell you and, where required, the ICO.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            We will update this page when what we do with data changes, for
            example before we add affiliate links or new features, and change
            the date at the top. For significant changes we will tell signed-in
            members on the site.
          </p>
          <p>
            <Link
              href="/"
              className="text-post font-semibold underline underline-offset-4"
            >
              Back to Random Acts of Santa
            </Link>
          </p>
        </Section>
      </div>
    </article>
  );
}

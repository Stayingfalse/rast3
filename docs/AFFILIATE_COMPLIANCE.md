# Amazon affiliate links: compliance rules

Random Acts of Santa is an Amazon.co.uk Associate. The account's default
tracking ID is `raosanta04-21`, and the pool holds `raosanta01-21` to
`raosanta12-21`.

This file lists the rules we follow and where the code handles each one.
Check it before changing anything that touches wishlists, links, rewards,
emails, cookies or the gift pages. It was written on 20 Oct 2026; the source
rules are the Associates Operating Agreement, the Programme Policies and the
UK CAP Code.

## Where links appear

- **Tagged links only on public gift pages** (`/gift/<token>`,
  `src/app/gift/[token]/page.tsx`). They never appear on signed-in pages,
  in emails, push messages, PDFs, posters or anything offline. Members'
  dashboards link to the gift page, not to Amazon.
  - *Rule:* the site must be publicly available, and Special Links are not
    allowed offline or in unsolicited messages.
- **The referring page is never hidden.** Tagged links send the full gift
  page address (`referrerPolicy="no-referrer-when-downgrade"`).
  - No `noreferrer`, no redirects through our own URLs, and no link
    shorteners.
  - *Rule:* don't cloak or obscure where a click comes from. Sales through an
    intermediate site may not qualify.
- **Gift pages are fixed for the season** and never 404 while they exist.
  They stay out of search engines (`noindex`) but can be followed
  (`follow`), so Amazon's reviewers can check them.
- **Gift pages show no names, groups or emails.** They show only the wishlist
  link, guidance and the disclosure.
- **Real tracking IDs only on the registered site.** `tagForHost` in
  `src/server/affiliate.ts` uses the real ID only on `raosanta.uk`. Dev,
  previews and local runs get the dummy `raosantatest-21`.
- **The pages have real content.** Gift pages carry gifting guidance and an
  explanation of the link.
  - *Rule:* pages with Special Links need original content relevant to the
    link.

## Disclosures

Amazon requires its statement on the site, near the links. UK ad rules
(CAP Code; the 2020 ASA ASOS/Zoe Sugg ruling) say "affiliate" alone isn't
clear enough: say **"Ad"** up front, before people engage. So:

- **On gift pages**, *above* the button: "Ad · Affiliate link", then
  "As an Amazon Associate, Random Acts of Santa earns from qualifying
  purchases."
- **On group pages** where links are on (`affiliate-note.tsx`): "Ad ·
  Affiliate links" and the same statement.
- **Site footer** (`site-footer.tsx`) and the **privacy policy**
  (`/privacy#affiliate`).

## Incentives and money

- **No reward for using a link.** Stamps, kudos, streaks and any badges must
  count gifts however they were bought, and must never depend on clicking
  our links.
  - *Rule:* no consideration, reward or loyalty scheme for visiting Amazon
    through Special Links.
- **No commission sharing** with groups, organisers, charities or members.
  A paid "turn affiliate links off" plan for a community is fine; paying
  anyone out of commission is not.
- **No purchases by the account holder or their circle.** The owner doesn't
  buy through the site's links, and the owner's own friends groups and
  workplace stay **Off**.

## Content we never show

- **No scraped wishlist content.** No item lists, prices, images or reviews
  read from Amazon.
  - *Rule:* no data-mining or robots; prices only when served by Amazon's
    API, with its disclaimer; no cached images; no reviews or star ratings.
- **No Amazon logos or button images.** We only use the word "Amazon" in
  text. Using their marks would bring the trademark guidelines into play.
- **No Amazon scripts or cookies** (oneTag, widgets, native ads). If any are
  added, the cookie notice and privacy policy must change first.

## Switching it on (site admins, `/admin/affiliate`)

- The master switch is off by default.
- Defaults by kind: workplaces off, communities and friends groups on.
- Each group can be set to Site default / On / Off and given one tracking ID
  from the pool per season.

## Open items

- Confirm with Associates support that gift pages at unguessable addresses,
  which search engines don't index, count as "publicly available".
- Associates accounts need 3 qualifying sales within 180 days of sign-up.
- In Associates Central, list `raosanta.uk` only, not dev.
- Make sure Cloudflare's bot protection doesn't block Amazon's crawler from
  `/gift/`.

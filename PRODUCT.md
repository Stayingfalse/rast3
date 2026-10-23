# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Owner, 22 Oct 2026: the public site leads with **everyone**, through three
kinds of group ("three ways in"):

- **Workplaces.** Colleagues, often remote or hybrid, who don't know each
  other's home addresses. They join with a verified work email and pick a team.
- **Communities.** Groups whose members have unrelated email addresses, e.g.
  large Discord servers, joined through a linked Discord server.
- **Friends and family.** Small groups joined with an invite link or code.
- **Organisers and admins:** group organisers manage members and invites;
  site admins approve new groups, and moderate kudos.

## Product Purpose

Random Acts of Santa lets people send anonymous Christmas gifts to colleagues or
community members from their Amazon wishlists, and say thank you publicly with
kudos. Success: lots of small acts of kindness during the season, nobody left
out, and no awkwardness about money or addresses.

## Positioning

**Random Acts, not Secret Santa.** There is no closed sign-up, no draw and no
fixed one-to-one pairing. A member shares their wishlist and, whenever they're
ready, picks up random wishlists of other members (fewest-gifted first) and
gifts as many or as few as they like. Giving is optional; anyone can receive.
Addresses stay private because Amazon wishlists deliver without revealing them.

## Operating Context

- Christmas only: one site-wide season a year, mid-November to early January.
  Outside the season the site is a countdown and a place to get ready.
- Gifting opens on 15 November and closes on 6 January (site admins can change
  the dates). Every member checks in once a season to confirm their wishlist;
  until then their list isn't handed out.
- Flow: sign in (Google, Discord, Twitch, GitHub, Reddit or email link) →
  profile (name, Amazon wishlist from any Amazon store) → join a workplace, community or friends
  group → pick up random wishlists (fewest gifts first; at most five un-gifted
  at a time) → buy from the wishlist on Amazon → mark "Gifted" → recipients
  post thank-you postcards (kudos) to a feed.
- Members can request more wishlists, report a problem with a wishlist
  (private, empty, broken link), archive or unassign.
- Used on phones as much as desktops; often opened from a work chat link.

## Capabilities and Constraints

- Amazon wishlists from any Amazon store (owner, 22 Oct 2026); other wishlist
  sites are planned. Affiliate tags only go on amazon.co.uk links.
- Anonymous by design: gifters are never shown to recipients; kudos may be posted
  publicly by the recipient.
- Built: groups (workplaces, communities, friends), the yearly season and
  check-in, reminder emails, Amazon affiliate links on public gift pages (per
  group). Still to come: push notifications (see `docs/roadmap.md`).
- Monetisation (affiliate and/or subscriptions) is planned for 2027; nothing is
  for sale in 2026.

## Brand Commitments

- Name: **Random Acts of Santa** (short: RAoSanta, domain raosanta.uk). The
  wordmark carries the season year, updated annually: **2026** this season.
- Tone: warm, generous, a little playful; grown-up rather than childish.
- Existing assets: header logo and wordmark, Christmas ornament illustration set
  (`public/`), Santa/gift emoji used in copy.

## Evidence on Hand

- Real data in the database: members, departments, gifts marked as purchased,
  kudos (messages and photos). **The owner has approved showing live,
  anonymised totals publicly** (aggregate counts only, never names; small
  numbers hidden or rounded).
- No testimonials, logos of customer organisations, press or ratings exist.
  Do not invent any; kudos already posted are the only first-hand voices.

## Product Principles

1. Generosity without pressure: giving is always optional and never ranked.
2. Privacy first: no addresses, no gifter identities, no public names in stats.
3. Nobody left out: unseen wishlists get priority; every member can receive.
4. Effortless on a phone: everything doable in a minute from a chat link.
5. One season a year: make it feel like an event worth coming back to.

## Accessibility & Inclusion

Workplace use: aim for WCAG 2.1 AA (contrast, keyboard access, focus states,
reduced motion). Avoid excluding non-Christian colleagues: festive, but about
kindness and giving rather than religion.

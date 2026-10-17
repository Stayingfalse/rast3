# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary (this season): people at work.** Colleagues in an organisation,
  often remote or hybrid, who don't know each other's home addresses and want to
  share some Christmas goodwill across teams and departments. They join with a
  verified work email and are grouped by department.
- **Also served:** communities and friend groups whose members have unrelated
  email addresses (e.g. large Discord servers). Support for these groups is
  being built (Oct–Nov 2026); the public site leads with workplaces this season
  and treats communities as the second audience.
- **Admins:** site, domain and department admins who enable their organisation,
  manage members and departments, and moderate kudos.

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
- Flow: sign in (Google, Discord, Twitch, GitHub, Reddit or email link) →
  complete profile (name, work email, department, Amazon UK wishlist URL) →
  "Get my 3 wishlist assignments" → buy from the wishlist on Amazon → mark
  "Gifted" (optional note) → recipients and gifters post kudos (message + up to
  5 photos) to a feed scoped to department / organisation / site.
- Members can request more wishlists, report a problem with a wishlist
  (private, empty, broken link), archive or unassign.
- Used on phones as much as desktops; often opened from a work chat link.

## Capabilities and Constraints

- Amazon UK wishlists only today; other wishlist sites are planned.
- Anonymous by design: gifters are never shown to recipients; kudos may be posted
  publicly by the recipient.
- Groups (orgs, communities, friend groups), the yearly season, notifications and
  affiliate links are on the roadmap (`docs/roadmap.md`), not built yet.
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

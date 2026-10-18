# Roadmap: proof of concept by Nov 15, 2026; monetise in 2027

## Goals (from the owner, 15 Oct)

1. **Think beyond the brief.** Propose and build improvements the owner may not
   have thought of (see [Ideas backlog](#ideas-backlog)).
2. **Many kinds of group.** Work orgs (verified by email domain) *and* communities
   and friend groups whose members have unrelated emails, e.g. large Discord
   communities.
3. **Good UX on desktop and mobile.**
4. **Proof of concept this year, with a monetisation plan for next year**
   (subscriptions and/or affiliate revenue).

## How the work runs

- A nightly run starts around 04:50 UK time. The day's change is on `dev`,
  deployed to https://dev.raosanta.uk and tested end to end by 09:00.
- **At most one fundamental aspect of the site changes per day.** Small fixes
  found along the way can ride along.
- Each day ends with a PR into `main` and an update in the Claude chat. Nothing
  merges into `main` or deploys to prod without the owner's explicit approval.
- `dev` has its own database. Prod data is never used for testing.
- The owner's feedback on a PR takes priority over this plan.

| | Branch | Easypanel service | Database |
|---|---|---|---|
| Prod | `main` | `ras/raosanta-uk` (https://raosanta.uk) | `ras/database` → `ras` |
| Dev | `dev` | `ras/raosanta-dev` (https://dev.raosanta.uk) | `ras/database-dev` → `ras_dev` |

## Where the product is today

- **One user, one place.** `User.domain` and `User.departmentId` tie each person
  to a single work domain and department, so nobody can be in their company
  *and* a Discord server.
- **The mechanic is "random acts", not a classic draw.** Users are handed random
  wishlists (`WishlistAssignment`, optionally cross-department) and can get
  several; buying one creates a `Purchase`, and gifts get public `Kudos`.
- **Sign-in:** Google, Discord, Twitch, GitHub, Reddit and magic-link email,
  configurable from the admin pages.
- **Wishlists** are a single Amazon URL per user, with no item data on the site.

## Target model

- **Group**: `type` = `ORG` | `COMMUNITY` | `FRIENDS`. An org joins by verified
  email domain (today's Domain/Department flow); a community joins by Discord
  server membership (optionally a role); friends join by invite link or code.
- **Membership**: user ↔ group, with role (`MEMBER`, `MODERATOR`, `ADMIN`).
  One person can be in many groups.
- **Christmas season (site-wide, yearly)**: the site is exclusively for
  Christmas. One season a year, open from **mid-November to early January**
  (defaults about 15 Nov → 6 Jan, adjustable by the site admin). Groups don't
  set their own dates; they only choose a suggested budget and mixing rules.
  It keeps the **Random Acts** model, the site's key selling point: **not** a
  classic Secret Santa. There's no closed draw and no fixed 1:1 pairing: people
  pick up a random wishlist whenever they're ready and can do as many acts of
  kindness as they like.
  - *Off-season*: a countdown to opening. People can still create or join
    groups and get their wishlist ready, but no lists are handed out.
  - *Season end*: assignments are archived (the existing `archived` flag) and
    each group gets a recap; next year starts fresh.
  - Other occasions (birthdays, other holidays) belong to a separate sister
    project in future, not this site.
- **Wishlist** (one or more per user): Amazon, Throne, Etsy or any URL; Amazon
  item data read from public lists where possible.
- Existing prod data migrates into one `ORG` group per enabled domain, with
  departments kept as sub-groups.

## Plan

### Week 1: foundations and a clear view of the UX (16–20 Oct)
| Day | Date | Focus |
|---|---|---|
| 1 | Fri 16 Oct | Dev-only test login (env-gated) + Playwright smoke suite, with desktop and mobile screenshots of every page |
| 2 | Sat 17 Oct | Dev seed data: an org with departments and users, wishlists, assignments, purchases and kudos, loaded through a gated `/api/test-auth/seed` route (there's no direct DB access from CI), plus e2e tests of the wishlist flow |
| 3 | Sat 17 Oct | Prisma migrations baseline from the prod schema, so prod schema changes go through `migrate deploy` (needed before Week 2). **Pulled forward a day at the owner's request; every later day moved one day earlier.** |
| 4 | Sun 18 Oct | **Brand mark and sky (owner feedback, 17 Oct).** Rethink the logo for 2026 for design and readability while keeping the name "Random Acts of Santa", and replace or redraw the background and hanging baubles if something better suits the Christmas Post world. Use the impeccable skill and present directions before building. **Inserted at the owner's request: every later day moved one day later, using up the spare day.** |
| 5 | Sun 18 Oct | UX audit report (desktop + mobile) with screenshots, plus quick wins that don't touch the data model **Pulled forward to Sun 18 Oct at the owner's request; every later day moved one day earlier and the spare day is back.** |
| 6 | Sun 18 Oct | **Pulled forward to Sun 18 Oct at the owner's request; no run on Mon 19 Oct (weekly allowance), Day 7 was then also done on 18 Oct.** Security pass: server-side admin gating, remove or gate `/success` (shows thank-you posters' first names publicly; found in the Day 5 audit), `/debug` and `/pwa-test`; admin-only `wishlist.getAllReports` (any signed-in member can read every report with reporters' names), authorisation on every tRPC procedure, rate limits |
| 7 | Sun 18 Oct | **Done early on 18 Oct at the owner's request; every later day moved one day earlier and a second spare day added.** CI on PRs (typecheck, lint, build, e2e); a single deploy trigger so pushes stop cancelling each other |

### Week 2: groups (20–26 Oct), the core change
| Day | Date | Focus |
|---|---|---|
| 8 | Tue 20 Oct | Data model: Group, Membership, yearly Season, plus a migration of existing domains/departments into ORG groups (rehearsed on an anonymised copy; confirm prod DB backups first) |
| 9 | Wed 21 Oct | Scope every query to a group and season; tenant-isolation tests |
| 10 | Thu 22 Oct | Create a group + invite links/codes (friends groups) |
| 11 | Fri 23 Oct | **Org joining on trust (owner, 18 Oct: verifying work emails won't work, many organisations block outside email).** Members keep typing their work email, moved onto the new model, with lighter safeguards: an optional join code the organiser can share, organisers see who joined recently and can remove people, and a new organisation needs a site admin's OK before it goes live |
| 12 | Sat 24 Oct | Community joining via Discord: verify server membership (and optionally a role) with Discord OAuth |
| 13 | Sun 25 Oct | Group switcher + per-group home, designed mobile-first |
| 14 | Mon 26 Oct | Group admin console: members, roles, settings, moderation |

### Week 3: the Christmas season and wishlists (27 Oct – 2 Nov)
| Day | Date | Focus |
|---|---|---|
| 15 | Tue 27 Oct | Yearly Christmas season: site-wide open/close (default ~15 Nov → ~6 Jan), off-season countdown and wishlist prep, end-of-season archive; per-group budget and mixing rules |
| 16 | Wed 28 Oct | Fair-share assignment: hand out the wishlists that have had the fewest gifts or views first, so nobody is left out; sensible limits on how many lists one person holds |
| 17 | Thu 29 Oct | Wishlists beyond Amazon (Throne, Etsy, any URL) + URL validation and normalisation |
| 18 | Fri 30 Oct | Public Amazon wishlist reader (proof of concept): items, images, prices; cached and rate-limited |
| 19 | Sat 31 Oct | On-site wishlist view + "I'm buying this" per item to prevent duplicate gifts |
| 20 | Sun 1 Nov | Affiliate tagging of outbound links + disclosures (Amazon Associates rules) |
| 21 | Mon 2 Nov | Anonymous questions from Santa to giftee (e.g. "what size?") without revealing who's asking |

### Week 4: engagement, polish, launch (3–15 Nov)
| Day | Date | Focus |
|---|---|---|
| 22 | Tue 3 Nov | Notifications: email + PWA push (new list to pick up, reminders, gift received) |
| 23 | Wed 4 Nov | Discord bot proof of concept: `/santa join`, `/santa status`, reminders in a channel |
| 24 | Thu 5 Nov | Public landing page + "start a group" onboarding (mobile-first) |
| 25 | Fri 6 Nov | Gift-received confirmation + per-group thank-you/kudos feed |
| 26 | Sat 7 Nov | Privacy-friendly analytics for the monetisation case: affiliate clicks, funnel, group growth |
| 27 | Sun 8 Nov | Accessibility + mobile pass |
| 28 | Mon 9 Nov | Performance pass |
| 29 | Tue 10 Nov | Privacy and legal: data export/delete, terms, affiliate disclosure, cookies. Privacy policy commitments (18 Oct): automatic deletion of accounts not signed into for 24 months, self-service data export and delete, and a 16+ confirmation at sign-up. |
| 30 | Wed 11 Nov | Full regression on dev + launch checklist |
| 31 | Thu 12 Nov | Fixes from regression |
| 32 | Fri 13 Nov | Release candidate → prod (with the owner's approval) |
| 33 | Sat 14 Nov | **Spare day** (gained by pulling Day 5 forward): launch support, last fixes, or an extra feature from the backlog |
| 34 | Sun 15 Nov | **Spare day** (gained by doing Day 7 early on 18 Oct) |

## Monetisation (2027; this year only collects the evidence)

- **Affiliate**: tag outbound Amazon links (and other retailers with programmes).
  The data this year (clicks per member, conversion where reported) shows what
  that revenue is worth. Constraints to respect: Amazon disclosure rules, and no
  affiliate links in emails.
- **Free tier**: friend groups and small communities, so the site grows by word of mouth.
- **Paid "Community" tier** (e.g. large Discord servers): Discord bot,
  role-gated joining, custom branding, sub-groups, moderation tools.
- **Paid "Workplace" tier** (per org, per Christmas season): SSO/domain verification,
  department mixing, admin reports, charity/CSR wishlists, Slack/Teams reminders,
  invoicing.
- **Optional extras**: supporter tips, sponsored charity drives.
- Decide in January using this year's numbers. Stripe integration is a 2027 task,
  not part of the proof of concept.

## Ideas backlog

Suggestions beyond the brief, to schedule when the owner agrees:
- **Address privacy as a selling point**: Amazon wishlists can ship to the owner
  without showing the address; make that the default and explain it.
- **Throne support**: Throne is widely used by streamers and Discord creators,
  so it fits the communities target well.
- **Charity wishlists**: orgs add a shelter's or school's wishlist to the pool
  (good for workplace CSR and the paid tier).
- **Budget bands** per group, with each wishlist item tagged by price.
- **Calendar (.ics) export** for season opening, last-order-for-Christmas and season close.
- **"Shipped / arrived" tracking** with a nudge if nothing has arrived by a date.
- **Streaks and badges** for Random Acts (gentle gamification, opt-in).
- **Slack/Teams app** for the workplace tier.
- **Stale-wishlist detection**: private, empty or broken lists, plus a nudge to the owner.
- **Year-in-review recap** each January: gifts given per group, kudos highlights, an "opens again in November" reminder (good for return visits and next year's sign-ups).
- **Shareable "Wall of Kindness"**: at season end, turn a group's kudos into an
  anonymised image or page they can post on Discord or LinkedIn (free marketing).
- **Mobile header**: the floating "Join Santa" button covers headings on phones;
  the cookie banner fills half the screen (Day 4).
- **Copy refresh**: done on the 2026 design day (17 Oct).
- **Session refresh race**: Auth.js refreshes a session's expiry once a day; parallel
  requests at that moment can briefly read as signed out (seen in testing). Worth a
  retry in the client session provider, or a longer `updateAge` (Day 5).
- **Stamp album (yearly)**: built 18 Oct (see the log). Still to do: a 2027 stamp
  design each year, a sponsored stamp in 2027, and possibly showing a member's
  album to their group.
- **Share cards**: built on 18 Oct (see the log). Next: an "I collected the 2026
  stamp" card, and counting clicks back from shared links.
- **Hero cancellation mark**: strike a gold cancellation across the hero stamp's
  corner, to bring the franking device back into the lockup (finish-review idea,
  18 Oct).
- **Nobody left out**: highlight wishlists with no gifts yet as the season ends, and let generous members (or the org, via CSR budget) pick them up.

## Log

- **Day 0 (15 Oct):** created `ras/database-dev`; dev env now points at it with
  `PRISMA_DB_PUSH_ON_START=true`; reset `dev` to `main` (old dev saved as
  `dev-backup-2026-10-15`); fixed the Next 16 / next-auth dependency conflict
  that had broken every deploy since March (#16), plus the dev DB setup (#17).
  Both merged and deployed to prod (`434cc10`): healthy, 158 users intact.
  Goals expanded (above) and the plan rewritten around them. Owner: Random Acts
  (not a classic Secret Santa) is the key selling point, so there is no draw mode;
  the site is Christmas-only, with one season a year (mid-Nov → early Jan). Other
  occasions belong to a future sister project.
- **Day 1 (16 Oct):** dev-only test login (`/api/test-auth/login`, gated by
  `ENABLE_TEST_LOGIN` + `TEST_LOGIN_SECRET`, limited to `@e2e.raosanta.test`
  users, 404 otherwise) and a Playwright suite (desktop 1280×800 + Pixel 7):
  30/30 passing on dev. Run with `E2E_TEST_LOGIN_SECRET=… npm run test:e2e`.
  Note: full-page screenshots don't extend the fixed dark background, so
  lower sections look faded; the UX audit uses viewport screenshots.

- **Day 2 (17 Oct):** `/api/test-auth/seed` (same gate) creates a deterministic
  org: 3 departments, 15 members with wishlists, 30 assignments, 15 purchases,
  kudos, plus a "giver" for tests. Seed data stays on dev for browsing. New e2e
  tests: request 3 wishlists → mark one gifted; kudos feed; admin with data.
  The tests found two real bugs, both fixed: (1) `/api/auth/session` sent the
  httpOnly **session token** and the full user record to the browser
  (security); (2) on mobile the cookie banner covered modal buttons, so
  "Confirm Purchase" couldn't be tapped until cookies were dismissed.
- **Day 3 (17 Oct, pulled forward):** versioned Prisma migrations. Baseline
  `0_init` from the current schema; `PRISMA_SCHEMA_SYNC=migrate` runs
  `migrate deploy` on start and baselines an existing `db push` database only if
  it exactly matches the schema (otherwise reports drift and changes nothing).
  Dev switched to `migrate` and baselined cleanly (`/api/health` shows `0_init`).
  Prod still unset; switching it on is a one-line env change for the owner to approve.
  Guide: `docs/DATABASE_MIGRATIONS.md`. All later days moved one day earlier.
- **Extra day (17 Oct): 2026 design, "Christmas Post"** (#25, waiting for
  approval). Done with the impeccable skill: PRODUCT.md, a chosen direction,
  the build, the design detector, an independent finish review, then DESIGN.md.
  - **Look.** Night-navy sky and baubles kept, cream parcel-label surfaces,
    postal red for actions only, gold postmarks with the 2026 season mark,
    Archivo in place of Inter.
  - **Public home.** Live rounded totals (under 10 hidden). The server now
    decides signed-in vs signed-out, so the marketing no longer flashes.
  - **Signed-in home.** Wishlists shown as parcel labels; kudos as postcards.
  - **Checks.** 36/36 e2e pass on dev. The e2e run caught a stacking bug: the
    new cookie strip covered the buttons in mobile dialogs. Fixed.
  - **Admin.** Pages are not restyled yet; they're a candidate for the UX
    audit day.
- **17 Oct, late:** the owner merged #24 (project skills) and #25 (design).
  Prod auto-deployed from `main` and serves the new design; `/api/health` is
  healthy with 158 users. Owner feedback: the logo may be rethought for design
  and readability as long as the name stays "Random Acts of Santa", and the
  background or baubles can change if something better suits 2026. That became
  Day 4. Every later day moved one day later, which uses up the spare day.
- **Day 4 (18 Oct): brand mark and sky** (#26, waiting for approval). This
  answers the owner's message: rethink the logo but keep the name, and the
  background can change.
  - **Options.** Three logo directions (stamp, postmark roundel, gift tag) and
    three skies (current baubles, quiet night, hanging post) were drawn side by
    side. The owner was asleep, so A + 3 were built and the others are in the
    PR to choose from.
  - **Logo.** A perforated stamp with a red bauble. The name sits beside it in
    mixed case on two lines, and the year is on the stamp.
  - **Icons.** New icons and favicon replace the Santa emoji (a third-party
    Twemoji image). Also a social preview image and Open Graph tags.
  - **Sky.** Hanging-post clusters pinned to the edges (about 11 KB, was 186 KB).
  - **Plumbing.** `scripts/brand/build.mjs` generates every asset. The service
    worker cache is bumped, and the manifest no longer says "Secret Santa".
  - **Found along the way.** The corner postmark caused sideways scroll at
    1024px and 360px. Fixed.
  - **Review.** The finish review needed two rounds; the first was rejected for
    unclean screenshots. All fixes applied: the phone sky clears Sign in, the
    year is never under 10px, the lockup fits from 320px, and the label header
    is one title.
  - **Checks.** 36/36 e2e on dev.

### Tomorrow: Day 5 (Mon 19 Oct), UX audit
A desktop and mobile walk-through of every page, signed out, signed in and as
an admin. It ends with a written report and screenshots, then the quick wins
that don't touch the data model. Known items to include:
- admin pages still in the old style;
- the sign-in modal's leftover grey skeleton styles;
- dev offers only Google sign-in, so the email option is untested there;
- the "Domain" scope label in the kudos feed (call it "Organisation").
- **Extra (18 Oct, at the owner's request): stamp album.** The owner's choices:
  build it now, collect a stamp by giving *or* thanking, and back-fill 2025.
  - **The album.** One stamp per season on the signed-in home: 2025 is the star,
    2026 the bauble, and there's an empty "next Christmas" slot. A toast fires
    when this season's stamp is collected.
  - **How seasons are worked out.** From purchase and thank-you dates, with a
    season running 1 August to 31 July, so there's no schema change. Hidden
    kudos don't count. It moves onto the Season model when that lands
    (Week 3).
  - **Plumbing.** `stamps.getMyAlbum` returns your own activity only. The seed
    gives the test giver a December 2025 thank-you, and the e2e test checks the
    album before and after a gift.
- **Extra (18 Oct, at the owner's request): share cards.** Two cards, both
  1200×630 images generated on the server.
  - **Giving card.** Offered right after marking a gift as Gifted: a parcel
    label to a colleague, from Santa, address withheld, franked SENT.
  - **Thank-you card.** Offered after posting kudos: the message plus the first
    photo. Its public page shows every photo.
  - **Pages and links.** Public pages at `/sent/<code>` and `/thanks/<code>`
    carry previews for Slack, Teams and Discord, are noindex, and count views.
    Hidden thank-yous return 404.
  - **Database.** A new `ShareCard` table (additive migration
    `add_share_cards`). Cards never show names, departments, the gift or an
    address.
  - **Sharing later.** "Share this act" on gifted parcels and "Share" on your
    own postcards.
  - **Checks.** e2e: 38/38 on dev. A thank-you with a real photo upload was
    checked on dev.
  - **Group totals (same PR, at the owner's request).** Organisers (site
    admins, the organisation's domain admin, the department's admin) see "Your
    Christmas so far" on the home page.
  - **What the organisation or team card shows.** This season's rounded gifts,
    thank-yous and members (under 10 shows as "Under 10" and can't be shared),
    under a name the organiser chooses.
  - **Live link.** The card at `/team/<code>` is live, so the same link always
    shows the latest total.
  - **Database.** A second additive migration, `share_card_groups`, adds
    `groupKey` and `label` and extends the kind enum.
- **Day 5 (18 Oct, pulled forward): UX audit.** Report in
  `docs/ux-audit-2026-10-18.md`.
  - **Coverage.** Every page on desktop and Pixel 7, in four states (signed
    out, new member, member with gifts, admin), plus an axe scan of each.
  - **Fixed today.** Pinch-zoom was blocked on every page; the privacy policy
    text was near-invisible; the thank-you photo picker was unlabelled and
    unreachable by keyboard. Also: a branded 404 page, the email sign-in pages
    restyled, "Domain" renamed to "Organisation", and small contrast fixes.
  - **Moved on.** `/success` publicly shows thank-you posters' first names,
    added to Day 6. The admin area is still in the 2025 style, proposed for its
    own day or folded into Day 13. The privacy policy is a 2025 template, for
    Day 29 with the owner's wording.
- **Extra (18 Oct, at the owner's request): privacy policy.** A new UK GDPR
  policy written from what the code actually does.
  - **Owner's choices.** Controller: the owner, contact privacy@raosanta.uk.
    Users must be 16+. Accounts are kept until deleted, or after 24 months
    without a sign-in. Hosting and photo storage are in the UK or EU.
  - **Cookie banner.** No analytics run, so it is now an essential-cookies
    notice; the old "accept optional analytics" choice is gone.
  - **Sign-in window.** It no longer refers to terms of service that don't
    exist.
  - **Data minimisation.** The wishlist API no longer sends a wishlist owner's
    name to the member buying for them.
  - **Owner actions.** Create the privacy@raosanta.uk mailbox, cap server log
    retention at 30 days in Easypanel, and check whether the ICO data
    protection fee applies.
- **Day 6 (18 Oct, pulled forward; no run on Mon 19 Oct): security pass.**
  - **Holes closed.** Any signed-in member could make themselves an
    organisation admin, list every user with emails, see every wishlist link,
    and create, edit, disable or delete organisations and departments. All
    organiser APIs now refuse members and check the target is in the
    organiser's own organisation or department. Domain and department admins
    can no longer act on fellow or more senior organisers, or on themselves.
  - **Public feed.** The kudos feed sent posters' real names, profile photos,
    departments and private purchase notes to anyone, even though the page
    only showed festive names. It now sends none of that; organisers still
    see names for posts they can moderate.
  - **Removed.** `/success`, `/debug`, `/pwa-test`, `/api/test-logging` and
    unused procedures, including `wishlist.getAllReports`. `/admin` is gated
    on the server (members get the 404 page).
  - **Rate limits.** Per person, in memory (single container): 60 mutations a
    minute overall, plus hourly caps on wishlist requests, reports, thank-yous,
    share cards and new-organisation setup.
  - **Still open.** Anyone can join an organisation, or set up a new one and
    become its admin, by typing a work email they don't own. The owner decided
    against email verification (most organisations block outside email); Day 11
    adds trust-based safeguards instead. `/api/images/*` serves any key in the photo bucket.
- **Day 7 (18 Oct, pulled forward): CI.** One workflow, `.github/workflows/ci.yml`,
  replaces "Lint Code" (which pushed auto-fix commits to PR branches) and
  "Auto Deploy".
  - **Every PR and push:** typecheck, lint, Prisma schema check and build.
  - **Pushes to dev/main:** deploy only after the checks pass, one deploy per
    branch at a time. The deploy job waits until `/api/health` reports a
    process started after its webhook call, so a second push queues behind
    the first instead of cancelling its build.
  - **Pushes to dev:** the Playwright suite (desktop + Pixel 7) runs against
    dev once it's live; the report is kept for 14 days.
  - **Needs the owner:** add the `E2E_TEST_LOGIN_SECRET` repo secret (the same
    value as dev's `TEST_LOGIN_SECRET`); until then only the public e2e tests
    run in CI. Claude can't set GitHub secrets.
  - **Owner decision (18 Oct):** no work-email verification; Day 11 is now
    trust-based joining with lighter safeguards.


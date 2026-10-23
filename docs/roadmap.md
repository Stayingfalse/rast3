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

### Week 2: groups and onboarding (18–25 Oct), the core change
*Re-planned 18 Oct (owner): profile/onboarding rework added as Day 12, shadcn/ui adoption and a two-part admin rework added as Days 15–17; later days moved accordingly. Days 6–11 were done early on 18 Oct.*

| Day | Date | Focus |
|---|---|---|
| 8 | Sun 18 Oct | **Done early on 18 Oct at the owner's request.** Data model: Group, Membership, yearly Season, plus a migration of existing domains/departments into ORG groups (rehearsed on an anonymised copy; confirm prod DB backups first) |
| 9 | Sun 18 Oct | **Done early on 18 Oct at the owner's request.** Scope every query to a group and season; tenant-isolation tests |
| 10 | Sun 18 Oct | **Done early on 18 Oct at the owner's request.** Create a group + invite links/codes (friends groups) |
| 11 | Sun 18 Oct | **Done early on 18 Oct at the owner's request.** **Org joining on trust (owner, 18 Oct: verifying work emails won't work, many organisations block outside email).** Members keep typing their work email, moved onto the new model, with lighter safeguards: an optional join code the organiser can share, organisers see who joined recently and can remove people, and a new organisation needs a site admin's OK before it goes live (**owner confirmed 18 Oct**: required while the service is free; later tied to the paid plans) |
| 12 | Mon 19 Oct | **Done (nightly run, 19 Oct).** **Profile and onboarding rework (owner, 18 Oct).** Your profile is just you and your wishlist. Nothing is ever created from an email address alone. After the profile, two journeys: **(a) Join a group**: enter an invite code or link (friends and communities), use Discord (Day 13), or enter a work email for an organisation that already exists (plus its join code when it has one). If the work email's domain isn't linked to any organisation yet, offer to **start one** (journey b); if it's a public email domain (gmail.com, outlook.com, icloud.com and the like), don't offer an organisation and point them to joining or starting a **community or friends group** instead. **(b) Start a group**: an organisation (claims a non-public email domain, waits for site-admin approval) or a friends or community group (invite code, also waits for approval). People can be in several groups and add more any time from "Your groups". The work email becomes a detail of the organisation membership, not the profile. Existing members carry on unchanged: their organisation is already a membership. Also: the existing gmail.com (and any other public-domain) "organisation" is wound down with its members kept, and membership join dates from the Day 8 backfill are re-dated from each person's earliest activity (assignments, purchases, thank-yous) or the 2025 season start, so long-standing members stop showing as recent joiners. |
| 13 | Tue 20 Oct | **Done early (19 Oct, owner asked to run Days 13–15 back to back).** **Discord joining by server.** Organisers link a community group to a Discord server (optionally a role). Members sign in with Discord and can join any linked server they belong to. Server membership uses the `guilds` scope; role checks use `guilds.members.read`; no bot needed. |
| 14 | Wed 21 Oct | **Done early (19 Oct, back to back with 13 and 15).** **Group switcher and per-group home** (mobile-first), including picking up wishlists inside friends and community groups. |
| 15 | Thu 22 Oct | **Done early (19 Oct, back to back with 13 and 14).** **Adopt shadcn/ui (owner, 18 Oct).** Init on Tailwind v4, map the Christmas Post tokens (night, label, post, gold, pine, Archivo) onto its theme, add the core components (button, input, form, dialog, alert-dialog, tabs, table, dropdown, badge, toast) and move the profile window onto it as the first real use. Document component usage in DESIGN.md. |
| 16 | Fri 23 Oct | **Done early (20 Oct, at the owner's request).** **Admin rework 1: group organiser console**, built with shadcn/ui in the Christmas Post design. One place per group: members and roles, join code, recent joiners and removal, teams (the old departments), moderation and totals. Includes **"Bring your team" (owner, 19 Oct)**: when someone starts an organisation or group, give them a ready-to-send invite message (email, Teams/Slack, WhatsApp) with their link and code, plus a printable A4 poster with a QR code for the office kitchen or noticeboard, and a simple "joined in the first 48 hours" count so organisers (and the monetisation case) can see which groups take off. **First (owner feedback, 20 Oct): Discord linking without Developer Mode.** Replace the server/role ID fields with "Connect Discord" (OAuth), then a dropdown of servers the organiser manages (owner, Administrator or Manage Server permission), shown with name and icon. **Remove the role requirement** (owner, 20 Oct): drop the role field and role checks; anyone in a linked server can join. (The `discordRoleId` column can stay unused until a bot exists.) |
| 17 | Sat 24 Oct | **Done early (nightly run, 20 Oct).** **Admin rework 2: site admin console.** Approvals, all groups and users (proper data table), sign-in providers and health. The legacy Domains and Departments screens, and the legacy domain/department/admin-scope columns, are retired once nothing reads them (with a migration). *(The screens are retired; the columns still have about 300 readers, so their removal moved to the backlog as its own change.)* |
| 18 | Sun 25 Oct | **Done early (bonus day, 20 Oct).** Yearly Christmas season: site-wide open/close (default ~15 Nov → ~6 Jan), off-season countdown and wishlist prep, end-of-season archive; per-group budget and mixing rules Includes (owner, 18 Oct): **automatically archive wishlist pick-ups from previous seasons**, so 2025 assignments stop showing on dashboards, while past gifts stay in the stamp album and totals. Also **yearly re-onboarding (owner, 19 Oct)**: keep all past data, but at the start of each season put every member, new or returning, through the same onboarding: confirm name, refresh or re-confirm the wishlist link, and confirm or change groups (workplace, team, friends, communities). Nobody picks up or is handed out until they have checked in for the current season, so lists and groups are always current. |

### Week 3: the Christmas season and wishlists (26–31 Oct)
| Day | Date | Focus |
|---|---|---|
| 19 | Mon 26 Oct | **Done (21 Oct; the nightly run was missed and run by hand in the evening).** Fair-share assignment: hand out the wishlists that have had the fewest gifts or views first, so nobody is left out; sensible limits on how many lists one person holds |
| 20 | Tue 27 Oct | **Dropped by the owner (22 Oct): built, then rolled back before merging; replaced by reminder emails (from Day 24), done 22 Oct.** Was: **Re-planned 20 Oct (Amazon Associates rules: no scraping, prices only from Amazon, no cached images).** Wish ideas without scraping: members add a few gift ideas or interests to their profile (shown, anonymously, on the gift page), and organisers set a suggested budget band per group |
| 21 | Wed 28 Oct | **Removed by the owner (22 Oct): not needed, as Santas buy from the wishlist itself and Amazon marks bought items.** Now a spare day |
| 22 | Thu 29 Oct | **Done early (bonus day, 20 Oct): affiliate links.** Freed day: confirm the gift-page approach with Amazon Associates support, then the season's tracking IDs per group |
| 23 | Fri 30 Oct | **Removed by the owner (22 Oct): anonymous questions aren't needed, for the same reason.** Now a spare day |
| 24 | Sat 31 Oct | **Email part done early (22 Oct).** Still open: PWA push, and a "new lists to pick up" email digest |

### Week 4: engagement and launch prep (1–7 Nov)
| Day | Date | Focus |
|---|---|---|
| 25 | Sun 1 Nov | **Done early (bonus day, 22 Oct).** Public landing page refresh (mobile-first); onboarding itself moved to Day 12 |
| 26 | Mon 2 Nov | Gift-received confirmation + per-group thank-you/kudos feed |
| 27 | Tue 3 Nov | Privacy-friendly analytics for the monetisation case: affiliate clicks, funnel, group growth |
| 28 | Wed 4 Nov | Accessibility + mobile pass |
| 29 | Thu 5 Nov | Performance pass |
| 30 | Fri 6 Nov | Privacy and legal: data export/delete, terms, affiliate disclosure, cookies. Privacy policy commitments (18 Oct): automatic deletion of accounts not signed into for 24 months, self-service data export and delete, and a 16+ confirmation at sign-up. |

### Week 5: launch (8–15 Nov)
| Day | Date | Focus |
|---|---|---|
| 31 | Sat 7 Nov | Full regression on dev + launch checklist |
| 32 | Sun 8 Nov | Fixes from regression |
| 33 | Mon 9 Nov | Release candidate → prod (with the owner's approval) |
| 34 | Tue 10 Nov | **Spare day** (gained by working ahead on 18 Oct): launch support, last fixes, or an extra feature from the backlog |
| 35 | Wed 11 Nov | **Spare day** (gained by working ahead on 18 Oct): launch support, last fixes, or an extra feature from the backlog |
| 36 | Thu 12 Nov | **Spare day** (gained by working ahead on 18 Oct): launch support, last fixes, or an extra feature from the backlog |
| 37 | Fri 13 Nov | **Spare day** (gained by working ahead on 18 Oct): launch support, last fixes, or an extra feature from the backlog |
| 38 | Sat 14 Nov | **Spare day** (Amazon-only this year, owner 18 Oct): launch support, last fixes, or an extra feature from the backlog |
| 39 | Sun 15 Nov | **Spare day** (Discord bot moved to the backlog, owner 20 Oct) |

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

- **New organisations and pricing (owner, 18 Oct).** While Random Acts of Santa
  is free, every new organisation needs the site owner's approval before it
  goes live. Once paid plans exist, approval should come with choosing a plan
  instead.

## Ideas backlog

- **Auto-approve rules** (idea, 20 Oct): approve friends groups straight away
  while they are small (say under 15 members), and keep manual approval for
  workplaces and communities, so the November rush doesn't queue behind one
  admin.

- **Discord bot (owner, 20 Oct: backlog, owner is considering a bot with
  wider functionality).** Would enable: a role dropdown and role-gated
  joining for community groups, `/santa join` and `/santa status`, and
  reminders posted in a channel. Not in the 2026 plan.

- **2027: wishlists beyond Amazon** (Throne, Etsy, any URL), taken off the 2026 plan by the owner on 18 Oct.

Suggestions beyond the brief, to schedule when the owner agrees:
- **Address privacy as a selling point**: Amazon wishlists can ship to the owner
  without showing the address; make that the default and explain it.
- **Throne support**: Throne is widely used by streamers and Discord creators,
  so it fits the communities target well.
- **Charity wishlists**: orgs add a shelter's or school's wishlist to the pool
  (good for workplace CSR and the paid tier).
- **Budget bands / gift ideas**: built and dropped by the owner on 22 Oct
  (Santas buy from the list itself). Kept instead: a tip to list-makers to
  add things at a range of prices.
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
- **Owner decision (18 Oct, after Day 7):** new organisations need a site
  admin's approval before they go live, while the service is free; later this
  ties into the paid plans. Built on Day 11.
- **Day 8 (18 Oct, pulled forward): groups data model.** Additive migration
  `groups_and_seasons`: new `Season`, `Group` (kinds ORG, TEAM, COMMUNITY,
  FRIENDS; status PENDING, ACTIVE, DISABLED; optional join code) and
  `Membership` (MEMBER or ADMIN) tables. Nothing existing is changed or
  removed.
  - **Backfill, in the migration.** Every organisation becomes an ORG group:
    enabled ones ACTIVE, disabled ones DISABLED, and domains used by members
    or departments with no organisation record PENDING. Each department
    becomes a TEAM group under its organisation; members and their admin
    roles become memberships. Seasons 2025 and 2026 (15 Nov to 6 Jan).
  - **Rehearsal.** On a scratch MariaDB with deliberately messy data
    (mixed-case and padded domains, orphan departments, admins of groups
    they aren't in, a department with no domain) and re-run to prove it is
    idempotent. No anonymised prod copy: Claude has no prod database access.
  - **Kept in step until Day 9.** `src/server/groups.ts` mirrors profile
    saves, new organisations, admin department and role changes, and
    organisation enable, disable or delete into groups. The old fields stay
    the source of truth until Day 9 moves queries over.
  - **Before prod.** The owner confirms a fresh prod database backup before
    this merges; the migration runs on prod's next start.
- **Day 9 (18 Oct, pulled forward): scoping by group.** Who people give to,
  read and manage now comes from group memberships, not the legacy domain
  and department columns (still kept in step for the admin screens).
  - **One module:** `src/server/scope.ts`, plus admin permissions rebuilt on
    ADMIN memberships (site admin stays a flag on the user).
  - **Wishlist hand-outs.** Team first, then the rest of the organisation,
    then strangers. Strangers come only from other *approved* (ACTIVE)
    organisations, and members of a pending or disabled organisation can't
    pick up lists or post thank-yous.
  - **Also on groups:** team and organisation kudos feeds, which organisers
    see real names, moderation, the admin member and link lists, and the
    organisation and team share-card totals.
  - **Isolation tests** (`e2e/isolation.spec.ts`): the seed adds a rival
    approved organisation and a member of a pending one. Tests prove:
    - hand-outs stay inside the organisation until you ask for strangers;
    - feeds never cross organisations;
    - a rival organiser can't list or change the other organisation's
      members;
    - pending members can't take part.
  - **Seasons.** Group totals and stamps were already per season;
    per-season wishlists and archiving are Day 15 (season open and close),
    to avoid hiding last Christmas's lists before the season machinery
    exists.
- **Day 10 (18 Oct, pulled forward): start a group and invite people.**
  `/groups` lets anyone signed in start a friends or community group, join
  one with a code or link, and (as organiser) share the invite, make a new
  code or leave. `/join/<code>` is the invite page: signed-out visitors can
  sign in and come straight back (email sign-in now returns to the page you
  were on). Codes are 8 characters with no look-alike letters, shown as
  XXXX-XXXX, and accepted with or without the dash, in any case, or as a
  pasted link.
  - **Approval.** New groups start PENDING (owner's rule while it's free).
    People can join, but gifting waits for a site admin.
    `groups.setStatus` exists; the approval screen is Day 11.
  - **Limits.** Up to 10 groups per person; per-person rate limits on
    starting groups (5 an hour) and joining (20 an hour).
  - **Not yet.** Picking up wishlists inside a friends or community group
    comes with the group switcher (Day 13).
  - **Tests.** `e2e/groups.spec.ts`: start a group, invite page signed out,
    a friend joins with a lower-case dashed code, organiser-only code, wrong
    code 404.
- **Day 11 (18 Oct, pulled forward): organisations on trust.** No email
  verification (owner, 18 Oct); instead:
  - **Approval.** New organisations wait for a site admin. Setting one up
    now creates it as waiting, not live. The new `/admin/approvals` screen
    lists waiting, live and closed organisations and friends or community
    groups, with Approve, Close and Re-open. Approving an organisation also
    switches on its legacy Domain row, so the older screens agree.
    Members of a waiting organisation see a "waiting for approval" note and
    can't pick up lists yet.
  - **Join code.** Optional: organisers can require a code from new members
    (Admin overview: "Require a join code", "Make a new code", "Stop
    requiring a code"). Profile setup asks for it only when the
    organisation has one. Existing members are never asked.
  - **Recent joiners.** Organisers see who joined their groups in the last
    30 days and can remove someone from the organisation. Their account
    stays; their organisation, department, admin role and open wishlist
    pick-ups are cleared.
  - **Closed organisations** can't be joined.
  - **Tests.** `e2e/org-trust.spec.ts`: code required (rejected without,
    accepted lower-case and dashed), joiner listed and removed, and a new
    organisation is waiting (412 on hand-outs), then approved on the
    Approvals screen.
- **Re-plan (owner, 18 Oct evening).** The profile is too tied to work email
  for friends and communities, so Day 12 is now the profile and onboarding
  rework: profile = you and your wishlist, then "Join a group" by work email,
  invite code or Discord, with several groups allowed. shadcn/ui is adopted
  on its own day (15) before a two-part admin rework (16 organiser console,
  17 site admin console, legacy Domains/Departments retired). Everything
  else moved three days later; the release candidate is now Wed 11 Nov with
  four spare days after it.
- **Owner decision (18 Oct):** Amazon wishlists only this year. "Wishlists
  beyond Amazon" is off the 2026 plan (backlog for 2027); later days moved
  one day earlier and the freed day is a fifth spare day.
- **Owner feedback (18 Oct, after Day 11 went live).**
  - "Joined in the last 30 days" lists members from 2025: the Day 8 backfill
    gave memberships without a profile-completion date the backfill time.
  - A gmail.com "organisation" exists because people entered personal email
    as work email.
  - Both are fixed in Day 12. Last season's pick-ups still on dashboards are
    archived by the season work on Day 18.
- **Owner decision (18 Oct): two onboarding journeys.** Never create an
  organisation automatically from an email. After the profile (you and your
  wishlist): join a group (invite code, Discord, or a work email for an
  existing organisation), or start one. An unlinked work domain prompts
  "start an organisation?", but public email domains are pointed to
  community or friends groups instead. Written into Day 12.
- **Day 12 (Mon 19 Oct, nightly): profile and onboarding rework.**
  - **Profile is just you and your wishlist.** The profile window (name and
    Amazon wishlist) replaces the old one that mixed in work email,
    departments and setting up domains. Saving it the first time takes you
    to Your groups.
  - **Join your workplace** (on Your groups): enter a work email to join an
    existing organisation, plus its join code when it has one; a wrong code
    gets a clear message. If the domain isn't on the site, it offers "Start
    <domain>": you become its organiser and it waits for approval. Personal
    email providers (gmail.com, outlook.com, icloud.com and about 40 more)
    get "That's a personal email address" and are pointed to friends and
    community groups.
  - **Never automatic.** Organisations are never created from an email
    address any more: syncing a profile only joins existing ones. Once in a
    workplace you can pick your team or leave it.
  - **Home without a live organisation** shows "Join a group to start
    gifting", or "waiting for approval" for a pending one.
  - **API.** Removed `profile.completeProfile`, `updateProfile` and
    `setupNewDomain`. Added `profile.saveProfile` and
    `groups.myOrganisation`, `joinOrganisation`, `startOrganisation`,
    `setMyTeam` and `leaveOrganisation`.
  - **Data migration `onboarding_cleanup`** (rehearsed on a scratch
    MariaDB):
    - re-dates the Day 8 backfilled memberships from each person's earliest
      activity (2025 season start if none), so long-standing members stop
      showing as recent joiners;
    - removes public-email-domain "organisations" (e.g. gmail.com), with
      their departments and Domain rows. Members keep their accounts,
      wishlists and history; site admins keep their role.
  - **Tests.** New `e2e/onboarding.spec.ts`: profile, then join workplace
    and pick team; personal email pointed to communities; unknown domain,
    then start an organisation, which is waiting. `org-trust.spec.ts`
    moved to the new API.
  - **Still single-workplace.** One organisation per person for now (the
    legacy domain column); any number of friends and community groups.
    Multiple workplaces would come with retiring the legacy columns (Day 17)
    if wanted.
  - **Next: Day 13 (Tue 20 Oct), Discord joining by server.**
- **Day 12 merged to prod (19 Oct, owner approved).** The `onboarding_cleanup`
  migration ran on prod. Owner liked the "Bring your team" idea: added to
  Day 16 (organiser console).
- **Owner decision (19 Oct): yearly re-onboarding.** Keep old data; every
  member re-does onboarding each season (wishlist and groups confirmed)
  before taking part. Added to Day 18 (Christmas season).
- **Day 13 (19 Oct, pulled forward): Discord joining by server.**
  - **Organisers** of a community group link it to a Discord server ID (and
    optionally a required role ID) from its card on Your groups. One server
    links to one group; ids are validated.
  - **Members** get "Join with Discord" on Your groups. "Find my Discord
    communities" lists linked servers they're in and joins with one click,
    re-checking the server and role. If Discord isn't connected (or was
    connected before the new permission), "Connect Discord" links it to the
    current account and comes back.
  - **Under the hood.** Discord sign-in now asks for `guilds` and
    `guilds.members.read`; tokens are saved on every Discord sign-in and
    refreshed when they expire. Migration `group_discord` adds
    `Group.discordGuildId` (unique) and `discordRoleId`.
  - **Privacy policy** updated (19 Oct): we check servers and roles only
    when asked and don't keep the list.
  - **Testing.** Dev has no Discord sign-in, so e2e covers linking (valid,
    invalid, duplicate, non-organiser) and the "connect Discord" prompt; the
    real server check needs a manual try on prod.
  - **Later.** A server picker instead of pasting ids (needs the
    organiser's managed servers), and a bot for channel reminders (Day 25).
- **Day 14 (19 Oct, pulled forward): group switcher and gifting in friends
  and community groups.**
  - **Switcher.** The home page has a "Gifting in" tab row when you're in
    any friends or community group: Workplace (if you have one) and each
    group. The last choice is remembered per browser.
  - **Group home.** Each group's tab shows its name and member count, a
    "Pick up a wishlist" button (fewest-gifted first, never yourself or
    someone you already hold), and your parcels from that group with "Open
    wishlist" and "Mark as gifted". Waiting or closed groups explain why
    there's no button.
  - **Under the hood.** `wishlist.requestFromGroup`; `getMyAssignments`
    takes an optional group (default: workplace pick-ups only). Migration
    `assignment_group` adds `WishlistAssignment.groupId`.
  - **Tests.** `e2e/group-home.spec.ts`: a friends group can't hand out
    while waiting (412), a friend joins with the code, a site admin
    approves, then a member switches tab, picks up, gifts, and gets "no
    more wishlists" once the group is exhausted.
  - **Later.** Thank-yous and totals per friends/community group (Day 27
    kudos per group); fair-share limits (Day 19).
- **Day 15 (19 Oct, pulled forward): adopt shadcn/ui.**
  - **Init.** `shadcn init` with the Radix base and "nova" style
    (`components.json`, `src/lib/utils.ts` on clsx + tailwind-merge).
  - **Theme on our tokens.** shadcn's theme variables are mapped onto the
    Christmas Post tokens in `globals.css` (label-stock surfaces, post-red
    primary, rule borders, gold focus ring, 6px radius; one theme). Init's
    global base overrides (body background, default border colour, Geist
    font) were removed so the rest of the site is unchanged.
  - **Components:** button, input, label, field, dialog, alert-dialog, tabs,
    table, dropdown-menu, badge and separator, with buttons and inputs
    resized to 44px.
  - **First real use:** the profile window is now a shadcn `Dialog` with
    `Field`s. A first-time profile can't be dismissed (Escape and clicking
    outside are blocked); editing can.
  - **DESIGN.md** documents when and how to use the components.
  - **Fixed along the way.** The CLI added a bogus `cn` npm package and
    imported from it; removed and pointed at `~/lib/utils`.
  - **Not yet.** Toasts stay on react-hot-toast; the admin rework (Days 16
    and 17) is the first big consumer.
  - **Next: Day 16 (nightly), the group organiser console, including "Bring
    your team".**
- **Owner feedback (20 Oct, 01:41): Discord linking.** Pasting IDs with
  Developer Mode is too technical. Day 16 starts with a "Connect Discord"
  button and a dropdown of manageable servers; a role dropdown needs a bot
  (Day 25), since user OAuth can't list role names.
- **Owner decision (20 Oct): no Discord bot for now.** Remove the Discord role
  requirement (Day 16); the Discord bot day comes off the plan and goes to the
  backlog, and the freed day becomes a spare.
- **Day 16 (20 Oct, pulled forward): organiser console and "Bring your
  team".**
  - **Discord linking without Developer Mode.** Organisers press "Connect
    Discord" and pick from a dropdown of the servers they own or manage
    (name and icon; checked with Discord when saving). The role requirement
    is gone and the scope is now just `identify email guilds`.
  - **Organiser console** at `/groups/<id>/manage` (shadcn/ui), reached from
    "Manage group" and "Manage workplace" buttons:
    - **Members:** newest first with a "New" badge (last 30 days), email,
      joined date and wishlist status; make or unmake organiser (friends
      and community groups; at least one organiser is kept); remove with a
      confirmation (a workplace removal takes them out of the organisation,
      account kept).
    - **Bring your team:** a ready-made invite message (copy, email,
      WhatsApp, Teams/Slack) and a printable A4 poster with a QR code
      (`/groups/<id>/poster`).
    - **Stats:** members, joined in the first 48 hours, joined this week, and
      wishlists gifted in friends and community groups.
    - **Settings:** rename (friends and community), invite or join code,
      Discord, and teams for workplaces (list and add).
  - **Privacy policy** updated (20 Oct) for the Discord change.
  - **Tests.** New `e2e/organiser-console.spec.ts` (manage members, invite
    message, poster QR, non-organisers blocked); `discord.spec.ts` rewritten
    for the picker (connect first, own servers only).
  - **Next: Day 17 (nightly), the site admin console;** the legacy Domains
    and Departments screens are retired.
- **Day 16 merged to prod (20 Oct, owner approved).**
- **Day 17 (20 Oct, nightly run): site admin console.**
  - **Site admins only.** `/admin` is now just for site admins. An organiser
    who opens it goes to their own console (Day 16); anyone else gets the
    404. The top-right "Admin" button is now "Site admin" and only shows for
    site admins.
  - **Rebuilt on shadcn/ui** with a ruled tab bar: Overview, Approvals,
    Groups, People, Wishlists, Kudos and Sign-in.
    - **Overview:** groups waiting for approval and reported wishlist
      problems, with links; people, wishlists, joined this week, picked up and
      gifts sent; groups by kind (live, waiting, closed); health (database,
      migrations, schema sync, running since); sign-in options on or off.
    - **Approvals:** cards with confirm-before-close and a link to each
      group's console.
    - **Groups:** every group except teams, with search, kind and status
      filters, members, who started it, and actions (open console, approve,
      close).
    - **People:** search by name or email, 25 a page, their groups (organiser
      marked), wishlist, pick-ups and gifts; make or remove a site admin and
      delete an account, both confirmed. You can't change or delete yourself.
  - **Retired:** the Domains and Departments screens, the old users screen
    (department and admin-scope editing) and the old overview with its
    per-domain table. The Wishlists, Kudos and Sign-in pages are unchanged
    inside the new frame; restyling them is a polish item.
  - **Legacy columns** are not dropped yet (about 300 readers); see the
    backlog.
  - **Tests.** New `e2e/admin-console.spec.ts` (overview, groups search to
    console, people actions, access rules). `org-trust`, `signed-in` and
    `wishlist` specs updated for the new screens.
  - **Next: Day 18, the Christmas season** (open and close, archive last
    season's pick-ups, yearly re-onboarding).
- **Day 17 merged to prod (20 Oct, owner merged).**
- **Bonus day (20 Oct, owner's request): legacy organisation model retired.**
  - **Gone:** the `Domain` and `Department` tables, `User.domain`,
    `departmentId` and `adminScope`, the DOMAIN and DEPARTMENT admin levels,
    and `Group.departmentId`. Workplaces and teams are only groups and
    memberships now; organisers are ADMIN memberships, and `adminLevel` is
    just SITE or USER.
  - **Migration `retire_legacy_org`:**
    1. Archives the old rows into `_legacy_Domain`, `_legacy_Department` and
       `_legacy_UserOrg`, which keep their data and have no foreign keys.
    2. Re-runs the Day 8 backfill as a safety net.
    3. Moves group share cards onto group ids.
    4. Drops the old schema.

    It was rehearsed on a scratch MariaDB with organisers, team admins, a
    missing team and a missing membership. All were carried over correctly,
    and the database matched the schema afterwards.
  - **Code:**
    - The old `user` and `domain` admin routers are deleted.
    - Joining, starting and leaving a workplace and choosing a team write
      memberships directly. `groups.addTeam` replaces `profile.createDepartment`.
    - Kudos feed scopes are now team, workplace and site.
    - Wishlist "from" labels and stats, sharing, the admin wishlist list and the
      dev seed read groups. The compiler confirms nothing reads the old fields.
  - **Behaviour changes:**
    - Leaving a workplace now only deactivates workplace pick-ups; friends and
      community pick-ups stay.
    - The kudos moderation badge reads "Organiser" or "Site admin".
  - **Later:** drop the `_legacy_*` archive tables after the 2026 season (one
    small migration).
- **Faster CI merged (20 Oct, #45).** Desktop and mobile e2e run in
  parallel, each in its own test email subdomain. A dev run takes about
  5½ minutes, down from 13–15.
- **Bonus day (20 Oct, owner's request): Amazon affiliate links.**
  - **Rules followed (Associates operating agreement and policies):**
    - Tagged links sit only on public pages, and the full referring page
      address is sent with the click.
    - An "Affiliate link" label and the disclosure sit next to every link,
      and the pages around links have real content.
    - No redirects through our own site.
    - No rewards for using links, and no commission sharing.
    - The owner's own friends groups stay off.
  - **Gift pages** (`/gift/<token>`): one fixed, unguessable, signed-out page
    per wishlist, group and season. It shows the tagged link, the
    disclosure and gifting guidance. It shows no names, groups or emails,
    and it never 404s during the season.
  - **Admin (`/admin/affiliate`):**
    - a master switch (off until the owner turns it on);
    - the default tracking ID `raosanta04-21`;
    - defaults by kind (workplaces off, communities and friends on);
    - per-group On/Off/Default and a tracking ID per group and season.
    Tracking IDs are created by hand in Associates Central.
  - **Members** see a note on group pages explaining the links. A site
    footer and the privacy policy carry the disclosure.
  - **Owner decisions (20 Oct):** only site admins switch it for now; a
    paid opt-out for communities may come in 2027. Gift pages stay fixed
    rather than expiring.
  - **To do:** confirm with Amazon Associates support that a public gift
    page at an unguessable, unindexed address counts as publicly
    available. Days 20 and 21 were re-planned so nothing reads or scrapes
    wishlists.
- **Affiliate compliance pass merged (20 Oct, #47).**
  - "Ad · Affiliate link" labels sit above the link.
  - Live tracking IDs are used only on raosanta.uk.
  - Gift pages are `noindex, follow`.
  - `docs/AFFILIATE_COMPLIANCE.md` lists the rules and where each is handled.
  - The owner sent Amazon an example gift page.
- **Bonus day (20 Oct, owner's request): Day 18, the Christmas season.**
  - **Season dates:** 15 Nov to 6 Jan by default, editable on
    `/admin/season`, which also shows how many members have checked in.
    - Before the season opens, members see a countdown and get their
      wishlist ready, but pick-ups are refused.
    - Site admins can open a group early from the Groups tab menu, for
      testing or for the owner's Amazon example group.
  - **Yearly check-in (owner, 19–20 Oct).**
    - Every member, including those who joined in October, confirms their
      wishlist ("keep" or "use a different one") and reviews their groups
      once a season.
    - Until then they can't pick up and their list isn't handed out.
    - A new member's first profile counts as their check-in.
  - **Archiving:**
    - Pick-ups from before 1 Aug 2026 were archived by migration. The app
      keeps archiving lazily as seasons roll over.
    - Within a season, nobody is given the same list twice.
    - Past gifts stay in the stamp album.
  - **Gift pages are untouched** by dates, check-ins and archiving, so the
    example sent to Amazon stays live. A page whose owner deletes their
    account now says the list is gone instead of returning 404.
  - **Not built yet** from the original Day 18: per-group budgets and
    mixing rules. Budgets move to Day 20, which already has organiser
    budget bands; mixing rules go to the backlog.
  - **Next: Day 19 (nightly), fair-share assignment.**
- **Day 18 merged to prod (20 Oct, owner approved).**
- **Two independent reviews (20 Oct, owner's request), then pre-season fixes.**
  - Two separate read-only reviewers each checked the code against the
    owner's decisions. Both confirmed the main rules hold:
    - no draw;
    - organisations only started explicitly, then approved;
    - `/admin` access;
    - the legacy model fully gone;
    - where tagged links appear;
    - season and check-in guards on every pick-up route.
  - **Critical:** a wishlist could only ever be given to a person once, so
    returning members' pick-ups would have failed from 15 Nov. Now it's once
    per season (migration `pre_season_fixes`).
  - **Also fixed:**
    - buyers no longer receive owner IDs, which an organiser could map to
      names;
    - emptied groups close instead of being deleted, so gift pages survive;
    - the default tracking ID can't be shared with a group;
    - strangers' lists only come from open workplaces;
    - leaving a group releases your pick-ups;
    - wishlist links lose their query string, so nobody's own `?tag=`
      rides along;
    - `/api/health` no longer shows exact counts;
    - "open early" lasts one season;
    - removing someone from a workplace only removes them from that one;
    - thank-yous can only be tied to a gift you received;
    - season dates are validated.
  - **Owner decisions:** gift pages keep the wishlist they were made for, and
    members' emails stay hidden from organisers until a group is approved.
  - **Not changed (noted):** a few legacy members may still hold two
    workplace memberships; this needs a look at prod data.
- **Day 19 (21 Oct, nightly run done by hand in the evening): fair-share
  hand-outs.**
  - **One shared picker for every route:** initial, additional, other
    teams, other organisations, and friends and community groups. It hands
    out lists in this order:
    1. fewest gifts received this season;
    2. then fewest current holders;
    3. then at random, so ties don't always favour the same person.

    Previously each route sorted by current holders only, with no random
    tie-break on the workplace routes, so the same lists came up first
    every time.
  - **Holding limit:** at most 5 un-gifted lists per person at once, across
    all groups. Pick-ups are trimmed to the room left and refused with a
    clear message when full; gifting frees a place.
  - **Not done:** "views" as a fairness signal. We don't record when lists
    are opened (gift pages are deliberately untracked). Gifts and holders
    cover the intent.
  - **Built on #49**, the pre-season fixes, which is still waiting for
    approval: both change the same pick-up code.
  - **Tests:** new `e2e/fair-share.spec.ts` with an eight-person group. A
    gifted list waits behind the ones with no gifts; a sixth pick-up is
    refused; gifting frees a place.
  - **Next: Day 20, gift ideas and budget bands** (re-planned 20 Oct).
    Members add a few gift ideas to their profile, shown anonymously on the
    gift page, and organisers set a suggested budget band per group.
- **Day 19 and pre-season fixes merged to prod (21 Oct, owner approved).**
  #49, then #50; the `pre_season_fixes` migration ran cleanly on prod.
- **Day 20, gift ideas and budgets (22 Oct, nightly): built, then dropped.**
  - PR #51 was closed unmerged. The owner's reasoning: Santas buy what's on
    the wishlist, so neither is needed. What's kept is a tip, shown where
    members add their list, to include things at a range of prices.
  - **Dev repair:** reverting removed Day 20's migration file, but the dev
    database had applied it. On startup, schema sync then reported
    "foreign-history" and refused to migrate (the public health e2e caught
    it). Dev now carries two dev-only migrations, the restored file and a
    drop of its two columns, so its history is recognisable and its schema
    matches main. They are never merged into main.
  - **Lesson:** never revert an applied migration by deleting its file. Undo
    it with a new migration on the same branch.
- **Reminder emails (22 Oct, owner's choice to replace Day 20; pulled
  forward from Day 24).**
  - **Hourly job inside the app**, started from `src/instrumentation.ts`, so
    there's no external scheduler and prod needs no new secret. It sends:
    - from two weeks before gifting opens, a nudge to members who haven't
      checked in for this Christmas (otherwise their list isn't handed out);
    - in gifting's first week, "gifting is open" (worded for checked-in or
      not);
    - a gift check-in: 4 to 14 days after a Santa marked a gift to
      someone's list, if they haven't posted a thank-you since, a gentle
      "has anything turned up?" email. It's at most one a fortnight, and
      never goes to people nobody has sent anything. (First built as an
      email on the day of the gift; the owner changed it the same evening
      because that spoils the surprise. Migration `gift_check_in` renames
      the email kind.)
  - **Safety:**
    - every email is claimed in `EmailLog` before it's sent, so it goes once
      even if the job overlaps itself;
    - at most 100 per kind per run;
    - test and `.test` addresses are never emailed;
    - dev has no SMTP, so it only logs.
  - **Opting out:**
    - each email has a signed "Stop reminder emails" link (the page needs a
      button press, so mail scanners can't unsubscribe anyone);
    - one-click `List-Unsubscribe` for mail apps;
    - a "Reminder emails" checkbox in the profile.

    Sign-in links always go. The privacy policy now covers reminders.
  - **Small:**
    - `markPurchase` no longer returns the list owner's id to the buyer;
    - the shadcn Checkbox was added (the shadcn CLI keeps adding a stray `cn`
      package and import, so that's fixed by hand each time).
  - **Migration** `email_reminders`, rehearsed on a scratch MariaDB.
  - **Tests:** `e2e/email-reminders.spec.ts` drives the job at pretend dates
    through a test-only endpoint. It checks:
    - the nudge goes only to people who haven't checked in, once;
    - "gifting is open" skips anyone who opted out;
    - nothing goes on the day of a gift, nor to someone who already said
      thanks, nor to anyone nobody has sent anything; the check-in goes
      once, days later;
    - the stop link and one-click work;
    - the profile checkbox works.
  - **Owner, 22 Oct: Days 21 (duplicate-gift claims) and 23 (anonymous
    questions) are removed.** Santas buy from the wishlist itself. Both are
    now spare days.
  - Day 25 was then done the same evening as a bonus day (below).
- **Day 25 early (22 Oct, bonus day, owner's request): landing page refresh.**
  - **Owner's choices:** lead with everyone through three ways in, and show
    the season dates on the parcel label.
  - **Hero:**
    - "Send someone a Christmas gift without ever knowing their address";
      the body names workplace, community and friends.
    - The label reads "To: Someone in your group" and gains a Posting row
      ("Opens 15 November", then "Open until 6 January", then "Closed until
      next November"), all read live from the season settings.
    - Under the buttons: "Been before? Sign in and check in for Christmas
      2026…", where "Sign in" opens sign-in.
  - **Three ways in:** a new label-stock sheet for workplace, Discord
    community and friends, each with its Group and Join with field rows, plus
    "Organising one? … Start a group".
  - **Route and small print brought up to date:**
    - no departments; start with up to three from your team; hold up to
      five at a time;
    - thank-you postcards and the yearly stamp;
    - new answers for "When does it run?" and "Is it free?" (affiliate
      links, stated plainly);
    - the closing line follows the season.
  - **Phones:** the opening line is shorter and the paragraph is normal
    size, so the label's airmail edge shows on the first screen.
  - **Finish review** (impeccable's reviewer) made six fixes:
    - no kicker above door titles;
    - the proof line went back under the buttons, clear of the postmark;
    - the inline Sign in works;
    - pick-up and join-code copy matches the code;
    - PRODUCT.md, DESIGN.md and the surface brief now record the owner's
      22 Oct decisions.
  - **Next (nightly, 23 Oct): Day 24's remainder,** PWA push notifications
    and a "new lists to pick up" email. Then Day 26 onwards as planned.
- **Home page rethink (22 Oct, same evening, owner's request): the stamp rack.**
  - **Owner's ask:** think past last year's copy; ask visitors what they're
    there for and pitch to them; scroll animation; the sell matters most.
  - **Concept:** chosen from three structures dealt by impeccable's concept
    roll.
  - **The rack:** "Who's posting?" with two rows of rubber stamps. First,
    which group: workplace, Discord server, or friends and family. Second,
    "I've been invited" or "I'm organising it". That gives six audiences
    (owner: each kind of group has organisers and users).
  - **What each combination re-prints:** the parcel label's To line (franked
    again), the headline, four worries answered, four steps, the button,
    and the small print (minus anything already answered).
  - **Shareable:** `?for=<group>-<join|run>` opens on one pitch, so a Discord
    admin can post the members' version. Older `?for=` values still work.
  - **Motion:**
    - stamps press;
    - the pitch re-prints;
    - sections are posted in as they scroll into view, and the route's line
      draws station by station;
    - reduced motion shows everything at rest.

    DESIGN.md's motion rules are updated to match.
  - **Phones:** a compact address strip under the rack carries the To line
    and the frank, because the label is below the fold.
  - **Also:**
    - signed-out visitors no longer see an empty "No thank-yous yet" box;
    - copy claims were checked against the code, which removed a Discord
      role-gating claim (role gating isn't built yet).
  - **Finish review:** two rounds, all fixes applied.
- **Any Amazon store (22 Oct, owner):** wishlists from every Amazon store
  are now accepted (.com, .de, .fr, .co.jp, .com.au and the rest), not just
  amazon.co.uk. Copy says "Amazon wishlist" everywhere.
  - Only amazon.co.uk links carry the affiliate tag (it's a UK Associates
    account); other stores' lists open straight on Amazon, with no gift
    page.
  - Look-alike domains are refused.
  - There was no earlier record of an international check: the code had
    accepted amazon.co.uk only.
- **Amazon.com affiliate links (23 Oct, owner's request).**
  - The owner opened a US Associates account (default `raosanta-20`, plus
    `raosanta01-20` to `09-20`).
  - Lists on amazon.com now open from gift pages tagged with the group's
    US ID, or the US default.
  - Admins set a UK and a US ID per group per season, and both defaults.
  - The pool holds both stores, told apart by the -21 or -20 ending.
  - Migration `affiliate_us_store` adds the store to group IDs, the US
    default and the owner's US IDs.
  - This is 23 Oct's one fundamental change, so the 04:50 nightly run does
    wrap-up only.
- **US affiliate links merged to prod (23 Oct, owner approved),** as #54. The
  `affiliate_us_store` migration ran cleanly.
- **Wishlist opens and the store report (23 Oct, owner's request).**
  - **What's counted:** clicking a link to Amazon (from a parcel, or the
    gift page's button) sends a beacon to `/api/track/open`. It records the
    Amazon store, whether the group had affiliate links on, whether the link
    was tagged, and whether it came from a gift page.
  - **Privacy and compliance:** no cookies and no third parties. Links are
    untouched (no redirect, so the referrer stays visible, as the Associates
    rules require). The same click within 30 seconds counts once.
  - **Admin › Affiliate › Wishlist opens:** a table of stores (lists on
    file, opens, tagged, missed) sorted by missed, so the top row is the next
    Associates programme worth joining. Also the most-opened groups, and
    opens versus pick-ups.
  - **Privacy policy and cookie banner** now say this ("No tracking cookies").
  - **Migration:** `wishlist_opens`.
  - **Fundamental changes:** this is a second one on 23 Oct, at the owner's
    request.

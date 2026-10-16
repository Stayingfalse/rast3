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

### Week 1: foundations and a clear view of the UX (16–21 Oct)
| Day | Date | Focus |
|---|---|---|
| 1 | Fri 16 Oct | Dev-only test login (env-gated) + Playwright smoke suite, with desktop and mobile screenshots of every page |
| 2 | Sat 17 Oct | Dev seed data: an org with departments and users, wishlists, assignments, purchases and kudos, loaded through a gated `/api/test-auth/seed` route (there's no direct DB access from CI), plus e2e tests of the wishlist flow |
| 3 | Sun 18 Oct | Prisma migrations baseline from the prod schema, so prod schema changes go through `migrate deploy` (needed before Week 2) |
| 4 | Mon 19 Oct | UX audit report (desktop + mobile) with screenshots, plus quick wins that don't touch the data model |
| 5 | Tue 20 Oct | Security pass: server-side admin gating, remove or gate `/debug` and `/pwa-test`, authorisation on every tRPC procedure, rate limits |
| 6 | Wed 21 Oct | CI on PRs (typecheck, lint, build, e2e); a single deploy trigger so pushes stop cancelling each other |

### Week 2: groups (22–28 Oct), the core change
| Day | Date | Focus |
|---|---|---|
| 7 | Thu 22 Oct | Data model: Group, Membership, yearly Season, plus a migration of existing domains/departments into ORG groups (rehearsed on an anonymised copy; confirm prod DB backups first) |
| 8 | Fri 23 Oct | Scope every query to a group and season; tenant-isolation tests |
| 9 | Sat 24 Oct | Create a group + invite links/codes (friends groups) |
| 10 | Sun 25 Oct | Org joining via verified work email, moved onto the new model |
| 11 | Mon 26 Oct | Community joining via Discord: verify server membership (and optionally a role) with Discord OAuth |
| 12 | Tue 27 Oct | Group switcher + per-group home, designed mobile-first |
| 13 | Wed 28 Oct | Group admin console: members, roles, settings, moderation |

### Week 3: the Christmas season and wishlists (29 Oct – 4 Nov)
| Day | Date | Focus |
|---|---|---|
| 14 | Thu 29 Oct | Yearly Christmas season: site-wide open/close (default ~15 Nov → ~6 Jan), off-season countdown and wishlist prep, end-of-season archive; per-group budget and mixing rules |
| 15 | Fri 30 Oct | Fair-share assignment: hand out the wishlists that have had the fewest gifts or views first, so nobody is left out; sensible limits on how many lists one person holds |
| 16 | Sat 31 Oct | Wishlists beyond Amazon (Throne, Etsy, any URL) + URL validation and normalisation |
| 17 | Sun 1 Nov | Public Amazon wishlist reader (proof of concept): items, images, prices; cached and rate-limited |
| 18 | Mon 2 Nov | On-site wishlist view + "I'm buying this" per item to prevent duplicate gifts |
| 19 | Tue 3 Nov | Affiliate tagging of outbound links + disclosures (Amazon Associates rules) |
| 20 | Wed 4 Nov | Anonymous questions from Santa to giftee (e.g. "what size?") without revealing who's asking |

### Week 4: engagement, polish, launch (5–15 Nov)
| Day | Date | Focus |
|---|---|---|
| 21 | Thu 5 Nov | Notifications: email + PWA push (new list to pick up, reminders, gift received) |
| 22 | Fri 6 Nov | Discord bot proof of concept: `/santa join`, `/santa status`, reminders in a channel |
| 23 | Sat 7 Nov | Public landing page + "start a group" onboarding (mobile-first) |
| 24 | Sun 8 Nov | Gift-received confirmation + per-group thank-you/kudos feed |
| 25 | Mon 9 Nov | Privacy-friendly analytics for the monetisation case: affiliate clicks, funnel, group growth |
| 26 | Tue 10 Nov | Accessibility + mobile pass |
| 27 | Wed 11 Nov | Performance pass |
| 28 | Thu 12 Nov | Privacy and legal: data export/delete, terms, affiliate disclosure, cookies |
| 29 | Fri 13 Nov | Full regression on dev + launch checklist |
| 30 | Sat 14 Nov | Fixes from regression |
| 31 | Sun 15 Nov | Release candidate → prod (with the owner's approval) |

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
- **Copy refresh**: the homepage still says "2025" and "Bring Secret Santa to Remote
  Teams"; it should pitch Random Acts for orgs, communities and friends (Day 4/23).
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

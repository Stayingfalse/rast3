# Development roadmap (Oct 16 – Nov 15, 2026)

Goal: a full-featured Secret Santa–style site. The owner's org keeps working
as today, and other orgs can sign up. Members join, say where they work, share
an Amazon wishlist, get assigned other people's wishlists, and buy gifts.

## How the work runs

- A nightly run starts around 04:50 UK time. The day's change is on `dev`,
  deployed to https://dev.raosanta.uk and tested end to end by 09:00.
- Each day changes **at most one fundamental aspect** of the site. Small fixes
  found along the way can ride along.
- Each day ends with a PR into `main` and an update in the Claude chat. Nothing
  merges into `main` or deploys to prod without the owner's explicit approval.
- `dev` uses its own database (`ras/database-dev`, db `ras_dev`). Prod data
  (`ras/database`, db `ras`) is never used for testing.
- Plans can change: the owner's feedback on a PR takes priority over this list.

## Environments

| | Branch | Easypanel service | Database |
|---|---|---|---|
| Prod | `main` | `ras/raosanta-uk` | `ras/database` → `ras` |
| Dev | `dev` | `ras/raosanta-dev` (https://dev.raosanta.uk) | `ras/database-dev` → `ras_dev` |

Pushing to either branch starts a deploy through the Easypanel webhook.

## Plan

### Week 1: foundations
| Day | Date | Focus |
|---|---|---|
| 0 | Thu 15 Oct | Separate dev database; schema sync on start; fix the broken Next 16 build |
| 1 | Fri 16 Oct | Dev-only test login (env-gated) + Playwright end-to-end smoke suite |
| 2 | Sat 17 Oct | Seed script for realistic dev data (orgs, departments, users, wishlists) |
| 3 | Sun 18 Oct | Proper Prisma migrations: baseline from prod schema, deploy via `migrate deploy` |
| 4 | Mon 19 Oct | Audit and bug sweep of current flows (sign-in, profile, wishlist, assignment, purchase) |
| 5 | Tue 20 Oct | Security pass: authorisation checks on every tRPC procedure, rate limiting |
| 6 | Wed 21 Oct | CI: GitHub Actions for typecheck, lint, build, and e2e on PRs |

### Week 2: organisations
| Day | Date | Focus |
|---|---|---|
| 7 | Thu 22 Oct | Organisation model: orgs own domains and departments (data model only) |
| 8 | Fri 23 Oct | Self-service org sign-up flow + org admin role |
| 9 | Sat 24 Oct | Joining an org: email-domain verification and invite links |
| 10 | Sun 25 Oct | Tenant isolation: every query scoped to the user's org, with tests |
| 11 | Mon 26 Oct | Org admin dashboard: members, departments, settings |
| 12 | Tue 27 Oct | Exchange "seasons" per org: open/close dates, budget, rules |
| 13 | Wed 28 Oct | Onboarding UX and landing page for new orgs |

### Week 3: wishlists and Amazon
| Day | Date | Focus |
|---|---|---|
| 14 | Thu 29 Oct | Wishlist URL validation and normalisation (amazon.co.uk/.com, share links) |
| 15 | Fri 30 Oct | Server-side public wishlist reader (items, images, prices) with caching |
| 16 | Sat 31 Oct | On-site wishlist view for assignees, built from the reader's data |
| 17 | Sun 1 Nov | Affiliate tagging of outbound Amazon links |
| 18 | Mon 2 Nov | Wishlist health: detect private/empty/broken lists, nudge owners |
| 19 | Tue 3 Nov | Background refresh job for wishlists |
| 20 | Wed 4 Nov | "I bought this" per item, to avoid duplicate gifts |

### Week 4: the exchange and launch
| Day | Date | Focus |
|---|---|---|
| 21 | Thu 5 Nov | Assignment engine v2: fairness, exclusions, department mixing |
| 22 | Fri 6 Nov | Re-roll / swap requests with admin approval |
| 23 | Sat 7 Nov | Email notifications: assignment, reminders, thank-you |
| 24 | Sun 8 Nov | Purchase tracking and gift-received confirmation |
| 25 | Mon 9 Nov | Reporting for org admins and site admin |
| 26 | Tue 10 Nov | Accessibility and mobile pass |
| 27 | Wed 11 Nov | Performance pass (bundle, queries, caching) |
| 28 | Thu 12 Nov | Privacy: data export/delete, privacy page, cookie review |
| 29 | Fri 13 Nov | Load and end-to-end regression on dev; launch checklist |
| 30 | Sat 14 Nov | Fixes from regression |
| 31 | Sun 15 Nov | Release candidate; final prod deploy plan |

## Log

- **Day 0 (15 Oct):** created `ras/database-dev`; dev env now points at it with
  `PRISMA_DB_PUSH_ON_START=true`; reset `dev` to `main` (old dev saved as
  `dev-backup-2026-10-15`); fixed the Next 16 / next-auth dependency conflict
  that had broken every deploy since March.

# Random Acts of Santa (rast3)

Next.js 16 (App Router, webpack build) + tRPC + Prisma (MariaDB) + Auth.js v5
(database sessions) + Tailwind v4. Deployed with Easypanel from GitHub.

## Product rules (from the owner, not negotiable without asking)

- **Random Acts, not Secret Santa.** No closed draw, no fixed 1:1 pairing:
  members pick up random wishlists whenever they're ready, as often as they
  like. Never propose or build a classic draw mode.
- **Christmas only.** One site-wide season a year, mid-November to early
  January. No other occasions (a possible future sister project).
- Supports work orgs *and* communities / friend groups with unrelated emails
  (e.g. Discord servers). Proof of concept by 15 Nov 2026; monetisation in 2027.

## How the work runs

- The plan and daily log live in `docs/roadmap.md`. A nightly routine (04:50 UK)
  does one day's item; feedback from the owner beats the plan.
- **At most one fundamental change per day.** Small fixes found along the way are fine.
- Branch off `main` → merge into `dev` → test on https://dev.raosanta.uk → PR into `main`.
- **Never merge into `main`, deploy prod (`ras/raosanta-uk`) or change prod's
  env/database without the owner's explicit approval in chat.** Prod changes via
  the Easypanel connector are blocked for Claude; ask the owner to do them.
- PRs: GitHub REST API (`gh api`), GraphQL is unavailable. Include test results
  and, for UI work, desktop + mobile screenshots (pushed to the
  `e2e-screenshots` branch, never merged).

## Environments

| | Branch | Easypanel | Database |
|---|---|---|---|
| Prod | `main` | `ras/raosanta-uk` | `ras/database` (db `ras`) |
| Dev | `dev` | `ras/raosanta-dev` | `ras/database-dev` (db `ras_dev`) |

Pushing either branch deploys it. `/api/health` shows DB status, applied
migrations and the startup schema-sync result.

## Checks before pushing

```bash
npm ci && npx tsc --noEmit && npx eslint . && npm run build
E2E_TEST_LOGIN_SECRET=… npm run test:e2e   # against dev; desktop + mobile
```

The e2e suite uses the dev-only test login (`/api/test-auth/*`, 404 unless
`ENABLE_TEST_LOGIN` + `TEST_LOGIN_SECRET` are set; never on prod) and seed data
on the `e2e.raosanta.test` domain.

## Database

Versioned Prisma migrations (`prisma/migrations`, baseline `0_init`); both dev
and prod run `PRISMA_SCHEMA_SYNC=migrate` on start. Never edit an applied
migration. How to add one: `docs/DATABASE_MIGRATIONS.md`.

## UI / UX work

- Use the **impeccable** skill for any UI/UX design, critique, audit or polish.
  It designs against `PRODUCT.md` / `DESIGN.md` at the repo root (create them
  with the owner via `/impeccable init` before a redesign).
- Use the **shadcn** skill when adding or composing components once the project
  adopts shadcn/ui (it doesn't yet; adopting it is a fundamental change).
- Check every UI change at desktop (1280×800) and mobile (Pixel 7) widths.
- See `.claude/skills/README.md` for where the skills came from.

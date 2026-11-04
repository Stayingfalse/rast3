# Launch checklist (gifting opens 15 Nov 2026)

Day 31 (1 Nov 2026). What has to be true before members are pointed at
raosanta.uk for the season. **Checked** means verified on 1 Nov from the
outside or in the code; **Owner** means only the owner can do or confirm it.

## Site and data

| | Item | Status |
|---|---|---|
| ✅ | Prod healthy, database connected, migrations applied (20, latest `20261031050000_privacy`), `PRISMA_SCHEMA_SYNC=migrate` | Checked (`/api/health`) |
| ✅ | Test-only routes are off on prod (`/api/test-auth/*` → 404) | Checked |
| ✅ | Security headers: HSTS (preload), CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | Checked |
| ✅ | Season dates: gifting opens 15 Nov, closes 6 Jan (home page) | Checked |
| ✅ | Privacy policy, terms and "Your data" live; Amazon Associates disclosure in the footer | Checked |
| ⚠️ | **Database backups.** Easypanel's database schedule never fires (checked 3 and 4 Nov, even after recreating it), while volume backups do. Manual backups work (2 and 3 Nov). Until fixed: a manual backup each evening, or a volume backup of the database volume / a nightly `mysqldump` cron to IDrive e2. Also try one restore into a scratch database | **Owner** (Claude checks each morning) |
| ⬜ | Dev database (`ras/database-dev`) has no backup schedule | **Owner** |
| ⚠️ | Take a manual backup right before the release candidate (Day 33) | **Owner** |
| ⬜ | Thank-you photo storage (iDrive E2): bucket has a lifecycle/backup you're happy with | **Owner** |

## Sign-in and email

| | Item | Status |
|---|---|---|
| ⚠️ | **Google OAuth app published** (it's in "Testing": only listed test users can sign in with Google, and the Gmail token expires every 7 days) | **Owner** |
| ⚠️ | **Gmail re-authorised** in Admin › Settings after publishing. Check-in nudges start 1 Nov (two weeks before gifting opens); with a dead token they fail, stop after 3 failures and retry hourly | **Owner** |
| ⬜ | Send yourself a sign-in link on prod and check it arrives (not in spam) | **Owner** |
| ⬜ | Consider a raosanta.uk sender (SPF/DKIM/DMARC) rather than a personal Gmail for 300 emails a day | **Owner** |
| ⬜ | `privacy@raosanta.uk` mailbox exists and is read (named in the policy and terms) | **Owner** |
| ⬜ | Other sign-in providers (Discord, Twitch, GitHub, Reddit) each tried once on prod | **Owner** |

## Money and the law

| | Item | Status |
|---|---|---|
| ⬜ | Amazon Associates: affiliate links switched on for the groups you want (Admin › Affiliate), tracking IDs in the pool | **Owner** |
| ⬜ | ICO data protection fee: check whether it applies (ico.org.uk/fee) | **Owner** |
| ⬜ | Server logs kept no more than 30 days (policy says so) | **Owner** (Easypanel) |
| ⬜ | Read the terms (`/terms`) once more on prod | **Owner** |

## Running the season

| | Item | Status |
|---|---|---|
| ✅ | Full regression on dev: every page for visitors, members, organisers and site admins, desktop and Pixel 7 (`e2e/regression.spec.ts`: 40 pages each, no errors, failed requests or broken links), plus the full e2e suite (115/115 each) and accessibility checks | Checked (1 Nov) |
| ⬜ | At least one other site admin, so approvals don't wait on one person (the 15 Nov rush) | **Owner** |
| ⬜ | Approvals queue empty on 14 Nov | **Owner** |
| ⬜ | VAPID keys on dev and prod, if push notifications should ship this season | **Owner** |
| ⚠️ | Server stalls: CPU saturation. WordPress site stopped (2 Nov); techshorts renders on a second server (3 Nov). Still: ideally build the app image in GitHub Actions | **Owner** |
| ⬜ | Rotate secrets visible through the Easypanel connector (storage keys, tunnel token, WordPress DB passwords) and limit who can use it | **Owner** |
| ⬜ | Turn on Easypanel log collection, so the next incident has logs | **Owner** |
| ⬜ | Someone outside the project signs up on a phone from scratch and tells you what confused them | **Owner** |

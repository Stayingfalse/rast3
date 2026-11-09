# Launch checklist (gifting opens 15 Nov 2026)

Day 31 (1 Nov 2026), refreshed 8 Nov for launch week. What has to be true
before members are pointed at raosanta.uk for the season. **Checked** means
verified from the outside or in the code (1 Nov, or the date given);
**Owner** means only the owner can do or confirm it.

## Site and data

| | Item | Status |
|---|---|---|
| ✅ | Prod healthy, database connected, migrations applied (26, latest `20261107050000_group_launch`), `PRISMA_SCHEMA_SYNC=migrate` | Checked 8 Nov (`/api/health`) |
| ✅ | Test-only routes are off on prod (`/api/test-auth/*` → 404, including the new `discord-link`) | Checked 9 Nov |
| ✅ | Release candidate smoke check (Day 33): public pages, sign-in, account and admin closed to visitors, security headers, season dates on the home page | Checked 9 Nov (read-only, from outside) |
| ✅ | Security headers: HSTS (preload), CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | Checked |
| ✅ | Season dates: gifting opens 15 Nov, closes 6 Jan (home page) | Checked |
| ✅ | Privacy policy, terms and "Your data" live; Amazon Associates disclosure in the footer | Checked |
| ⚠️ | **Database backups.** Easypanel's database schedule (02:00) has still never run on its own (checked 8 Nov); the database volume has no volume backup either. Last backup: the owner's manual one on 6 Nov 01:58, before five migrations reached prod (launch emails, last order, Discord names and details on 6 Nov; group launch dates on 7 Nov). Take one now; until the schedule works, one each evening, or a nightly `mysqldump` cron to IDrive e2. Also try one restore into a scratch database | **Owner** (Claude checks each morning) |
| ⬜ | Dev database (`ras/database-dev`) has no backup schedule | **Owner** |
| ⚠️ | Take a manual backup right before the release candidate (Day 33) | **Owner** |
| ⬜ | Thank-you photo storage (iDrive E2): bucket has a lifecycle/backup you're happy with | **Owner** |

## Sign-in and email

| | Item | Status |
|---|---|---|
| ⚠️ | **Google OAuth app published** (it's in "Testing": only listed test users can sign in with Google, and the Gmail token expires every 7 days) | **Owner** |
| ⚠️ | **Gmail re-authorised** in Admin › Settings after publishing. Check-in nudges started 1 Nov; from 14 Nov site admins' morning status email, and from 15 Nov "gifting is open" and the organisers' "we're live" also depend on it. With a dead token they fail, stop after 3 failures and retry hourly | **Owner** |
| ⬜ | Send yourself a sign-in link on prod and check it arrives (not in spam) | **Owner** |
| ⬜ | Consider a raosanta.uk sender (SPF/DKIM/DMARC) rather than a personal Gmail for 300 emails a day | **Owner** |
| ⬜ | `privacy@raosanta.uk` mailbox exists and is read (named in the policy and terms) | **Owner** |
| ⬜ | Other sign-in providers each tried once on prod. Prod offers Google, Discord and an email link (checked 9 Nov); Twitch, GitHub and Reddit aren't set up there, so the sign-in page doesn't show them | **Owner** |

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
| ✅ | Full regression on dev: every page for visitors, members, organisers, a workplace organiser (console and team page, added 8 Nov) and site admins, desktop and Pixel 7 (`e2e/regression.spec.ts`: no errors, failed requests or broken links), plus the full e2e suite and accessibility checks | Checked 1 Nov; refreshed 8 Nov (see the roadmap log for the counts) |
| ⬜ | At least one other site admin, so approvals don't wait on one person (the 15 Nov rush). Friends groups and Discord-linked communities no longer wait (6 Nov); workplaces and unlinked communities still do | **Owner** |
| ⬜ | Approvals queue empty on 14 Nov | **Owner** |
| ⬜ | VAPID keys on dev and prod, if push notifications should ship this season | **Owner** |
| ⚠️ | Server stalls: CPU saturation. WordPress site stopped (2 Nov); techshorts renders on a second server (3 Nov). Still: ideally build the app image in GitHub Actions | **Owner** |
| ⬜ | Rotate secrets visible through the Easypanel connector (storage keys, tunnel token, WordPress DB passwords) and limit who can use it | **Owner** |
| ⬜ | Turn on Easypanel log collection, so the next incident has logs | **Owner** |
| ⬜ | Someone outside the project signs up on a phone from scratch and tells you what confused them | **Owner** |

## Launch week: this week's features (added 8 Nov)

| | Item | Status |
|---|---|---|
| ⬜ | **Last order date** on Admin › Season once Amazon UK publishes its Christmas delivery dates. No date, no countdown | **Owner** |
| ⬜ | Groups that agreed a later (or earlier) start: set their **gifting date** (Admin › Groups › Gifting date…, or the organiser on their console). Everyone else opens on 15 Nov | **Owner** / organisers |
| ⬜ | Launch week: look at Admin › Approvals once a day: "Large friends groups to check" and "Communities on Discord" (a server made this month is flagged) | **Owner** |
| ⬜ | Workplaces with a single organiser: add a second from the console's Members tab, and team leads where a workplace has teams | **Owner** / organisers |
| ✅ | Friends and community organisers can hide thank-yous for gifts in their group; terms say so (7 Nov) | Checked (e2e) |
| ✅ | Morning status email to site admins from 14 Nov (07:00 UK), "gifting is open" and "we're live" from each group's launch date | Checked (e2e on pretend dates) |
| ✅ | Quiet hours: members' and organisers' emails go 08:00–21:00 UK, so the midnight opening on 15 Nov doesn't send hundreds at once (9 Nov) | Checked (e2e) |


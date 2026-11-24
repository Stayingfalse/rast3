# Launch checklist (wishlist drive from 15 Nov, gifting opens 27 Nov 2026)

Day 31 (1 Nov 2026), refreshed 8 Nov for launch week and 23 Nov for opening day. What has to be true
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
| ⬜ | Season dates: gifting opens **27 Nov** (the last Friday in November; moved 14 Nov), closes 6 Jan. Prod's Season row overrides the code default, so set Admin › Season › Gifting opens = 27/11/2026 before midnight on 14 Nov | **Owner** |
| ✅ | Privacy policy, terms and "Your data" live; Amazon Associates disclosure in the footer | Checked |
| ✅ | **Database backups** run outside Easypanel's own schedule (which costs extra), in the owner's service `ras/db-backup` (deployed 21 Nov). Easypanel's Backups list therefore only shows manual backups. Owner's call (23 Nov): **don't remind about backups** | Owner (handled) |
| ⬜ | Dev database (`ras/database-dev`) has no backup schedule | **Owner** |
| ⬜ | Thank-you photo storage (iDrive E2): bucket has a lifecycle/backup you're happy with | **Owner** |

## Sign-in and email

| | Item | Status |
|---|---|---|
| ⚠️ | **Google OAuth app published?** If it's still in "Testing", only listed test users can sign in with Google, and Google ends the Gmail authorisation 7 days after it was given: the last one (21 Nov, about 12:00 UTC) would stop on **28 Nov**, the day after gifting opens. The email heartbeat would alert within the hour, but publishing it avoids that | **Owner** |
| ✅ | **Gmail sending works** (23 Nov): the 15-21 Nov outage was our code reusing an expired access token (fixed 21 Nov, #104); no email errors since. The email heartbeat alerts within the hour if it stops; the sign-in window then points members to Google and Discord (#107) | Checked |
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
| ⬜ | At least one other site admin, so approvals don't wait on one person (the drive from 15 Nov and the 27 Nov rush). Friends groups and Discord-linked communities no longer wait (6 Nov); workplaces and unlinked communities still do | **Owner** |
| ⬜ | Approvals queue empty on 26 Nov, and kept short during the drive | **Owner** |
| ⬜ | VAPID keys on dev and prod, if push notifications should ship this season | **Owner** |
| ⚠️ | Server stalls: CPU saturation. WordPress site stopped (2 Nov); techshorts renders on a second server (3 Nov). Still: ideally build the app image in GitHub Actions | **Owner** |
| ⬜ | Rotate secrets visible through the Easypanel connector (storage keys, tunnel token, WordPress DB passwords) and limit who can use it | **Owner** |
| ⬜ | Turn on Easypanel log collection, so the next incident has logs | **Owner** |
| ⬜ | Someone outside the project signs up on a phone from scratch and tells you what confused them | **Owner** |

## Launch week: this week's features (added 8 Nov)

| | Item | Status |
|---|---|---|
| ⬜ | **Last order date** on Admin › Season once Amazon UK publishes its Christmas delivery dates. No date, no countdown | **Owner** |
| ⬜ | Groups that agreed a later (or earlier) start: set their **gifting date** (Admin › Groups › Gifting date…, or the organiser on their console). Everyone else opens on 27 Nov | **Owner** / organisers |
| ⬜ | Launch week: look at Admin › Approvals once a day: "Large friends groups to check" and "Communities on Discord" (a server made this month is flagged) | **Owner** |
| ⬜ | Workplaces with a single organiser: add a second from the console's Members tab, and team leads where a workplace has teams | **Owner** / organisers |
| ✅ | **Launch rehearsal (23 Nov):** dev's season opened on 20 Nov and the full e2e suite run against it: 162 passed on desktop and 162 on mobile; the home page reads "Open until 6 January" and "Pick up a wishlist any time". Dev's season is back on 27 Nov | Checked (e2e) |
| ✅ | **Monitoring:** uptime monitors with a 02:55-03:25 UTC maintenance window for the nightly reboot (no alert on 22 or 23 Nov), heartbeats for the reminder run and the email server, prod error alerts | Checked |
| ✅ | Friends and community organisers can hide thank-yous for gifts in their group; terms say so (7 Nov) | Checked (e2e) |
| ✅ | Morning status email to site admins from the day before gifting opens (07:00 UK), one wishlist drive email to organisers of groups still to open from 15 Nov, "gifting is open" and "we're live" from each group's launch date | Checked (e2e on pretend dates) |
| ✅ | Quiet hours: members' and organisers' emails go 08:00–21:00 UK, so the midnight opening on 27 Nov doesn't send hundreds at once (9 Nov) | Checked (e2e) |


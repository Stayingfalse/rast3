# Launch day runbook (Sunday 15 November 2026)

What to look at on launch day, when, and what to do if something goes
wrong. Written 10 Nov from the launch checklist and this autumn's incidents.
UK times throughout.

## The night before (Saturday 14 Nov)

- **Take a database backup** in Easypanel (`ras/database` → Backups →
  Run now). The 02:00 schedule has never run on its own, so tonight's
  manual one is the restore point for launch.
- **Admin › Status** (`/admin/status`): everything green, or each item
  understood. The admins' morning status email started at 07:00 today;
  check it arrived (if not, Gmail is the problem: see below).
- **Admin › Approvals:** the waiting list empty, so no community or
  workplace starts launch day stuck.
- **Admin › Season:** dates read 15 November to 6 January; the last order
  date is set if Amazon has published it; the groups with their own launch
  date are the ones you expect.

## What happens on its own

| When | What |
|---|---|
| 00:00 | Gifting opens in every group on the season's date (groups with their own date open on that date instead) |
| 07:00 | Site admins' morning status email (then daily until 22 Nov) |
| 08:00 | "Gifting is open" to members, and "we're live" to organisers, start going out (quiet hours hold them overnight), up to the daily limit of 300 emails, then the rest next day |
| hourly | New-wishlist emails, gift check-ins, and anything held by the limit |
| ~03:05 | The server restarts most nights (seen every night since 2 Nov); a minute's outage |

## Checks during the day

| When | Where | Looking for |
|---|---|---|
| 07:00 | The status email, or Admin › Status | Anything under "Needs attention"; email failures 0 |
| 08:30 | Admin › Status › Emails | "Gifting is open" counting up as SENT, FAILED at 0 |
| 09:00, 13:00, 18:00 | Admin › Approvals | New workplaces and unlinked communities waiting (approve or close; people can join while they wait); large friends groups; Discord communities made this month |
| 10:00 | Admin › Insights | Check-ins and first pick-ups arriving |
| any time | An organiser asks "is it working?" | Point them at their console: the "Today" line refreshes every minute |

## When something goes wrong

**Emails failing (FAILED count rising, or no SENT after 08:30).**
Reminder runs stop after 3 failures in a row and try again an hour later,
so nothing is lost while you fix it. Usually the Gmail token has expired:
Admin › Settings › Email → re-authorise. If it still fails, check the
sending address isn't rate-limited (Gmail shows it on its own sign-in).
Sign-in links use the same email server, so new members can't sign in by
email until this is fixed; Google and Discord sign-in still work.

**The site is slow or not answering.** `https://raosanta.uk/api/health`
tells you if the app and database are up. Earlier stalls were the host's
CPU being full (WordPress, then techshorts renders): in Easypanel, look at
the host's CPU and stop anything else heavy. Restarting `ras/raosanta-uk`
is safe; members lose nothing.

**A group looks wrong** (a fake community, a "friends" group of 200
strangers, abuse). Admin › Approvals or Admin › Groups → Close. Members
keep their accounts and wishlists; they can't pick up in that group until
it's reopened.

**A thank-you is abusive.** Hide it from the feed's menu (site admins can
hide or delete any; organisers hide their own group's). Hidden ones also
leave the Wall of Kindness.

**Someone's wishlist is empty or private.** Santas report it; it shows
under Admin › Wishlists, and the list's owner sees a notice the next time
they visit. Nothing to do unless it's repeated.

**A member wants their data gone.** They can do it themselves at
`/account` (download, then delete). Site admins can't delete their own
account without another admin removing their admin access first.

**Something needs a code fix.** Tell Claude in the chat. Fixes go to dev
first and need your "merge" to reach prod; prod deploys take about 5
minutes and restart the app (a minute's outage).

## After launch day

- Keep the evening backup going until the schedule (or a `mysqldump`
  cron) runs on its own.
- The status email stops after 22 Nov; Admin › Status stays.

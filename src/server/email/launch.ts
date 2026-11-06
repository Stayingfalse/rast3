import type { Prisma, PrismaClient } from "@prisma/client";

import { openNowWhere, ownLaunchWithinWhere } from "~/server/group-launch";
import { launchStatus, PENDING_TOO_LONG_HOURS } from "~/server/launch-status";
import { seasonRange } from "~/server/stamps";
import { WALL_MIN_THANKS } from "~/server/wall";
import { isTestAddress } from "./mailer";
import { counted, engagedThisSeason, type Send } from "./rules";
import { adminStatus, organiserLive, type StatusSummary } from "./templates";

/**
 * Launch emails (owner, 6 Nov), run from runReminders, so they share its
 * daily limit, failure stop, test-user scope and once-only claims:
 *
 * - ORGANISER_LIVE: in gifting's first week (as SEASON_OPEN), each organiser
 *   of a live group hears it's open, with the group's invite link and a
 *   message to paste; a group with its own launch date (7 Nov) hears in the
 *   week after that date instead. One per organiser per group (ref = group id), so an
 *   organiser of two groups gets two, each about its own group.
 * - ADMIN_STATUS: site admins get Admin › Status by email each morning from
 *   the day before gifting opens to a week after, from 07:00 UK time (the
 *   first hourly run after it). Once a UK day (ref = the date).
 *
 * Both respect the reminder opt-out.
 */
type Ctx = {
  now: Date;
  w: { year: number; opensAt: Date; closesAt: Date };
  /** which users this run may email (scheduled runs: not e2e test users) */
  scope: Prisma.UserWhereInput;
  send: Send;
  went: (r: Awaited<ReturnType<Send>>) => boolean;
  /** in the season's first week */
  seasonJustOpened?: boolean;
};

const BATCH = 100;
/** an own-date group's organiser hears within this many days of it opening */
const LIVE_DAYS = 7;
const DAY = 24 * 3600_000;
/** the status email goes from this UK hour */
export const ADMIN_STATUS_HOUR = 7;
/** ...on UK days from this many before gifting opens to this many after */
const STATUS_FROM_DAYS = -1;
const STATUS_TO_DAYS = 7;

/** The UK date (YYYY-MM-DD), a day number for comparing dates, and the UK hour. */
export function ukClock(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, dayNo: Date.UTC(+p.year!, +p.month! - 1, +p.day!) / DAY, hour: Number(p.hour) };
}

export async function organiserLiveEmails(
  db: PrismaClient,
  { now, w, scope, send, went, seasonJustOpened = false }: Ctx,
) {
  const season = w.year;
  if (now > w.closesAt) return 0;
  // groups open now: in the season's first week, all of them; otherwise ones
  // whose own launch date was in the last week (7 Nov)
  const opened: Prisma.GroupWhereInput = seasonJustOpened
    ? openNowWhere(w, now)
    : ownLaunchWithinWhere(w, LIVE_DAYS, now);
  const organisers = await db.membership.findMany({
    where: {
      role: "ADMIN",
      // teams are organised through their workplace
      group: { AND: [{ status: "ACTIVE", kind: { not: "TEAM" } }, opened] },
      user: { emailReminders: true, email: { not: null }, AND: [scope] },
      // joined in this Christmas (checked in, signed up, or started organising
      // this group since the season began): last year's organisers who
      // haven't come back hear nothing (owner, 26 Oct)
      OR: [{ user: engagedThisSeason(season) }, { joinedAt: { gte: seasonRange(season).gte } }],
    },
    select: {
      user: { select: { id: true, email: true } },
      group: { select: { id: true, name: true, kind: true, emailDomain: true, joinCode: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (organisers.length === 0) return 0;
  const had = await db.emailLog.findMany({
    where: { kind: "ORGANISER_LIVE", season, userId: { in: organisers.map((o) => o.user.id) }, ...counted },
    select: { userId: true, ref: true },
  });
  const done = new Set(had.map((l) => `${l.userId} ${l.ref}`));
  let sent = 0;
  let tried = 0;
  for (const { user, group } of organisers) {
    if (done.has(`${user.id} ${group.id}`)) continue;
    if (tried++ >= BATCH) break;
    const r = await send(
      db,
      { id: user.id, email: user.email! },
      "ORGANISER_LIVE",
      season,
      () => organiserLive(user.id, season, group, w.closesAt, WALL_MIN_THANKS),
      group.id,
    );
    if (went(r)) sent++;
  }
  return sent;
}

export async function adminStatusEmails(db: PrismaClient, { now, w, scope, send, went }: Ctx) {
  const season = w.year;
  const clock = ukClock(now);
  const fromOpen = clock.dayNo - ukClock(w.opensAt).dayNo;
  if (fromOpen < STATUS_FROM_DAYS || fromOpen > STATUS_TO_DAYS || clock.hour < ADMIN_STATUS_HOUR) return 0;
  const admins = await db.user.findMany({
    where: {
      adminLevel: "SITE",
      emailReminders: true,
      email: { not: null },
      AND: [scope],
      emailLog: { none: { kind: "ADMIN_STATUS", season, ref: clock.date, ...counted } },
    },
    select: { id: true, email: true },
    orderBy: { id: "asc" },
    take: BATCH,
  });
  if (admins.length === 0) return 0;
  // only worked out when a real address will get it (test addresses are never sent)
  const summary = admins.some((a) => !isTestAddress(a.email!)) ? await statusSummary(db, now) : null;
  let sent = 0;
  for (const a of admins) {
    const r = await send(
      db,
      { id: a.id, email: a.email! },
      "ADMIN_STATUS",
      season,
      () => adminStatus(a.id, season, now, summary ?? { attention: [], rows: [] }),
      clock.date,
    );
    if (went(r)) sent++;
  }
  return sent;
}

const n = (v: number) => v.toLocaleString("en-GB");
const hours = (h: number) => (h < 48 ? `${h} ${h === 1 ? "hour" : "hours"}` : `${Math.floor(h / 24)} days`);

/** Admin › Status as counts for the email: no names, no addresses. */
async function statusSummary(db: PrismaClient, now: Date): Promise<StatusSummary> {
  const s = await launchStatus(db, now);
  const people = Object.fromEntries(s.people.map((p) => [p.what, p]));
  const row = (what: string): [string, string] => {
    const p = people[what];
    return [what, p ? `${n(p.day)} (${n(p.week)} this week)` : "—"];
  };
  const sent = s.emails.reduce((t, e) => t + e.SENT, 0);
  return {
    attention: s.attention.map((a) => a.text),
    rows: [
      row("Finished profiles"),
      row("Checked in for Christmas"),
      row("Group joins"),
      [
        "Groups waiting for approval",
        s.groups.pending === 0
          ? "none"
          : `${n(s.groups.pending)}, longest ${hours(s.groups.oldestHours ?? 0)}${
              s.groups.tooLong ? ` (over ${PENDING_TOO_LONG_HOURS} hours)` : ""
            }`,
      ],
      ["Reminder emails sent", n(sent)],
      ["Reminder emails failed", n(s.failed)],
      ["Daily email limit used", `${n(s.limit.used)} of ${n(s.limit.daily)}`],
      ["Wishlists picked up", n(s.lastDay.pickUps)],
      ["Gifts sent", n(s.lastDay.gifts)],
      ["Thank-yous", n(s.lastDay.thanks)],
    ],
  };
}

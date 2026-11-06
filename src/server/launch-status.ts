import type { EmailKind, EmailStatus, Prisma, PrismaClient } from "@prisma/client";

import { emailSettings } from "~/server/email/smtp";
import { REMINDER_DAILY_LIMIT } from "~/server/email/rules";
import { largeFriendsGroupIds, LARGE_FRIENDS_GROUP } from "~/server/friends-groups";
import { getMigrations, getSchemaSync, processStartedAt } from "~/server/health";
import { publicSeason, seasonWindow } from "~/server/season";
import { TEST_EMAIL_DOMAIN } from "~/server/utils/test-auth";

/**
 * Launch status (2 Nov): whether launch is going well or something is stuck,
 * for site admins, without opening Easypanel. Counts only, from what the site
 * already records; e2e test users are left out, as the scheduled reminders
 * leave them out.
 */
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** A group waiting longer than this needs someone to look at it. */
export const PENDING_TOO_LONG_HOURS = 24;
/** Reminders this far into the day's limit are worth a look. */
const LIMIT_WARN = 0.8;

const KINDS: EmailKind[] = [
  "CHECK_IN_NUDGE",
  "SEASON_OPEN",
  "GIFT_CHECK_IN",
  "NEW_LISTS",
  "ORGANISER_LIVE",
  "ADMIN_STATUS",
];
const STATUSES: EmailStatus[] = ["SENT", "SKIPPED", "FAILED"];

/** Real people only: no e2e test users (a person without an email is real). */
export const realUser: Prisma.UserWhereInput = {
  OR: [{ email: null }, { NOT: { email: { endsWith: TEST_EMAIL_DOMAIN } } }],
};

/** Midnight today in UK time. */
export function ukMidnight(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const sinceMidnight =
    (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000 +
    now.getMilliseconds();
  return new Date(now.getTime() - sinceMidnight);
}

/** Send errors can quote an address; never show one. */
const redact = (s: string) => s.replace(/[^\s<>"'@]+@[^\s<>"'@]+/g, "[address]");

export type Attention = { key: string; text: string };

export async function launchStatus(db: PrismaClient, now = new Date()) {
  const day = new Date(now.getTime() - DAY);
  const week = new Date(now.getTime() - 7 * DAY);
  const today = ukMidnight(now);
  const real = { user: realUser };

  const [
    profilesDay,
    profilesWeek,
    checkInsDay,
    checkInsWeek,
    joinsDay,
    joinsWeek,
    seenDay,
    seenWeek,
    unfinished,
    pending,
    oldestPending,
    emailRows,
    latestFailed,
    sentForLimit,
    pickUps,
    gifts,
    thanks,
    pickUpsDay,
    giftsDay,
    thanksDay,
    email,
    migrations,
    schemaSync,
    season,
    w,
    largeFriends,
  ] = await Promise.all([
    db.user.count({ where: { ...realUser, profileCompletedAt: { gte: day } } }),
    db.user.count({ where: { ...realUser, profileCompletedAt: { gte: week } } }),
    db.seasonCheckIn.count({ where: { ...real, createdAt: { gte: day } } }),
    db.seasonCheckIn.count({ where: { ...real, createdAt: { gte: week } } }),
    db.membership.count({ where: { ...real, joinedAt: { gte: day } } }),
    db.membership.count({ where: { ...real, joinedAt: { gte: week } } }),
    db.user.count({ where: { ...realUser, lastSeenAt: { gte: day } } }),
    db.user.count({ where: { ...realUser, lastSeenAt: { gte: week } } }),
    db.user.count({ where: { ...realUser, profileCompleted: false } }),
    db.group.count({ where: pendingGroups }),
    db.group.findFirst({
      where: pendingGroups,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.emailLog.groupBy({
      by: ["kind", "status"],
      where: { createdAt: { gte: day }, ...real },
      _count: { _all: true },
    }),
    db.emailLog.findFirst({
      where: { status: "FAILED", ...real },
      orderBy: { createdAt: "desc" },
      select: { note: true, createdAt: true },
    }),
    // exactly what the reminder run counts against its limit
    db.emailLog.count({ where: { status: "SENT", createdAt: { gte: day } } }),
    db.wishlistAssignment.count({ where: { assignedAt: { gte: today }, assignedUser: realUser } }),
    db.purchase.count({ where: { purchasedAt: { gte: today }, ...real } }),
    db.kudos.count({ where: { createdAt: { gte: today }, ...real } }),
    // the same over the last 24 hours, for the morning status email
    db.wishlistAssignment.count({ where: { assignedAt: { gte: day }, assignedUser: realUser } }),
    db.purchase.count({ where: { purchasedAt: { gte: day }, ...real } }),
    db.kudos.count({ where: { createdAt: { gte: day }, ...real } }),
    emailSettings().catch(() => null),
    getMigrations(),
    getSchemaSync(),
    publicSeason(db, now),
    seasonWindow(db),
    largeFriendsGroupIds(db, byRealPeople),
  ]);

  const count = (kind: EmailKind, status: EmailStatus) =>
    emailRows.find((r) => r.kind === kind && r.status === status)?._count._all ?? 0;
  const emails = KINDS.map((kind) => ({
    kind,
    ...(Object.fromEntries(STATUSES.map((s) => [s, count(kind, s)])) as Record<EmailStatus, number>),
  }));
  const failed = emails.reduce((n, e) => n + e.FAILED, 0);
  const oldestHours = oldestPending
    ? Math.floor((now.getTime() - oldestPending.createdAt.getTime()) / HOUR)
    : null;
  const emailSource = email ? (email.source === "environment" ? "environment" : "admin settings") : "none";
  const migrationFailed = migrations?.history.some((m) => m.state !== "applied") ?? false;
  const syncBad = schemaSync?.result === "failed" || schemaSync?.result === "foreign-history";

  const attention: Attention[] = [];
  if (emailSource === "none")
    attention.push({ key: "mail-server", text: "No email server is set up: sign-in links and reminders can't go out." });
  if (failed > 0)
    attention.push({ key: "failed", text: `${failed} reminder ${failed === 1 ? "email" : "emails"} failed in the last 24 hours.` });
  if (oldestHours !== null && oldestHours >= PENDING_TOO_LONG_HOURS)
    attention.push({
      key: "pending",
      text: `A group has waited ${waited(oldestHours)} for approval.`,
    });
  if (largeFriends.length > 0)
    attention.push({
      key: "large-friends",
      text: `${largeFriends.length === 1 ? "A friends group has" : `${largeFriends.length} friends groups have`} grown past ${LARGE_FRIENDS_GROUP} members: check ${largeFriends.length === 1 ? "it's" : "they're"} really friends and family.`,
    });
  if (sentForLimit >= REMINDER_DAILY_LIMIT * LIMIT_WARN)
    attention.push({
      key: "limit",
      text: `Reminders have used ${Math.round((sentForLimit / REMINDER_DAILY_LIMIT) * 100)}% of the daily limit; the rest wait for the next run.`,
    });
  if (!migrations || migrationFailed || syncBad)
    attention.push({ key: "schema", text: "The database migrations need a look (see App health)." });

  return {
    at: now,
    attention,
    people: [
      { what: "Finished profiles", note: "profile completed", day: profilesDay, week: profilesWeek },
      { what: "Checked in for Christmas", note: "season check-ins", day: checkInsDay, week: checkInsWeek },
      { what: "Group joins", note: "joins, not people", day: joinsDay, week: joinsWeek },
      { what: "Signed in and active", note: "last seen, updated daily", day: seenDay, week: seenWeek },
    ],
    unfinished,
    groups: {
      pending,
      oldestHours,
      tooLong: oldestHours !== null && oldestHours >= PENDING_TOO_LONG_HOURS,
      // friends groups skip approval (6 Nov); big ones are listed for a look
      largeFriends: largeFriends.length,
    },
    emails,
    failed,
    latestFailed: latestFailed && {
      note: latestFailed.note ? redact(latestFailed.note) : null,
      at: latestFailed.createdAt,
    },
    emailServer: emailSource,
    limit: { daily: REMINDER_DAILY_LIMIT, used: sentForLimit },
    today: { since: today, pickUps, gifts, thanks },
    lastDay: { pickUps: pickUpsDay, gifts: giftsDay, thanks: thanksDay },
    season: { year: w.year, phase: season.phase, opensAt: season.opensAt, closesAt: season.closesAt },
    health: {
      database: true,
      migrations: migrations && { applied: migrations.applied, latest: migrations.latest, failed: migrationFailed },
      schemaSync: schemaSync && { mode: schemaSync.mode ?? null, result: schemaSync.result ?? null },
      startedAt: processStartedAt(),
    },
  };
}

/** Groups not made by test users. */
const byRealPeople: Prisma.GroupWhereInput = {
  OR: [{ createdById: null }, { createdBy: realUser }],
};

/**
 * Groups waiting for approval (teams are approved with their workplace), not
 * made by test users. Since 6 Nov only workplaces and communities wait.
 */
const pendingGroups: Prisma.GroupWhereInput = {
  status: "PENDING",
  kind: { not: "TEAM" },
  ...byRealPeople,
};

const waited = (hours: number) =>
  hours < 48 ? `${hours} hours` : `${Math.floor(hours / 24)} days`;

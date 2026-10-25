import type { Prisma, PrismaClient } from "@prisma/client";

import { ARRIVAL_AFTER_DAYS } from "~/server/gifts";
import { seasonWindow } from "~/server/season";
import { sendOnce } from "./mailer";
import { checkInNudge, giftCheckIn, newLists, seasonOpen } from "./templates";

/**
 * Reminder emails (22 Oct), run hourly (src/instrumentation.ts):
 * - from two weeks before gifting opens, members who haven't checked in for
 *   this Christmas are asked to (otherwise their list isn't handed out);
 * - in gifting's first week, members from before it opened hear it's open;
 * - 4 to 14 days after a Santa marked a gift to someone's list, if they
 *   haven't posted a thank-you since, a gentle check-in (never on the day,
 *   which would spoil the surprise; at most one a fortnight).
 * - while gifting is open, people who have picked up a list this season hear
 *   about new members' wishlists that haven't had a gift yet (Day 24). At
 *   most one a week, and never within a week of the "gifting is open" email.
 *   Only to people already gifting: nobody who just receives is chased.
 * The first two go once per person per season; anyone can opt out.
 */
export const NUDGE_DAYS = 14;
const OPEN_DAYS = 7;
/** a gift check-in waits this long after the gift, and stops after GIFT_LATEST */
const GIFT_AFTER_DAYS = ARRIVAL_AFTER_DAYS;
const GIFT_LATEST_DAYS = 14;
/** new-lists emails: at most one per person this often */
const NEW_LISTS_EVERY_DAYS = 7;
/** per kind per run, to stay well inside SMTP sending limits */
const BATCH = 100;
const DAY = 24 * 3600_000;

export type ReminderRun = {
  season: number;
  nudged: number;
  opened: number;
  giftCheckIns: number;
  newLists: number;
};

export async function runReminders(
  db: PrismaClient,
  { now = new Date(), only }: { now?: Date; only?: Prisma.UserWhereInput } = {},
): Promise<ReminderRun> {
  const w = await seasonWindow(db);
  const season = w.year;
  const base: Prisma.UserWhereInput = {
    emailReminders: true,
    email: { not: null },
    profileCompleted: true,
    ...(only && { AND: [only] }),
  };
  const run: ReminderRun = { season, nudged: 0, opened: 0, giftCheckIns: 0, newLists: 0 };

  if (now < w.opensAt && now.getTime() >= w.opensAt.getTime() - NUDGE_DAYS * DAY) {
    const users = await db.user.findMany({
      where: {
        ...base,
        seasonCheckIns: { none: { season } },
        emailLog: { none: { kind: "CHECK_IN_NUDGE", season } },
      },
      select: { id: true, email: true },
      orderBy: { id: "asc" },
      take: BATCH,
    });
    for (const u of users) {
      const r = await sendOnce(db, { id: u.id, email: u.email! }, "CHECK_IN_NUDGE", season, () =>
        checkInNudge(u.id, season, w.opensAt),
      );
      if (r !== "DUPLICATE") run.nudged++;
    }
  }

  const openUntil = Math.min(w.opensAt.getTime() + OPEN_DAYS * DAY, w.closesAt.getTime());
  if (now >= w.opensAt && now.getTime() <= openUntil) {
    const users = await db.user.findMany({
      where: {
        ...base,
        // joined before it opened (older profiles have no date)
        OR: [{ profileCompletedAt: null }, { profileCompletedAt: { lt: w.opensAt } }],
        emailLog: { none: { kind: "SEASON_OPEN", season } },
      },
      select: { id: true, email: true, seasonCheckIns: { where: { season }, select: { season: true } } },
      orderBy: { id: "asc" },
      take: BATCH,
    });
    for (const u of users) {
      const r = await sendOnce(db, { id: u.id, email: u.email! }, "SEASON_OPEN", season, () =>
        seasonOpen(u.id, season, w.closesAt, u.seasonCheckIns.length > 0),
      );
      if (r !== "DUPLICATE") run.opened++;
    }
  }
  // Gift check-ins: owners of lists gifted 4 to 14 days ago, earliest gift
  // first, who haven't posted a thank-you since and haven't had one lately
  const gifts = await db.purchase.findMany({
    where: {
      purchasedAt: {
        gte: new Date(now.getTime() - GIFT_LATEST_DAYS * DAY),
        lte: new Date(now.getTime() - GIFT_AFTER_DAYS * DAY),
      },
      // already said it arrived: nothing to check in about
      receivedAt: null,
      wishlistAssignment: { season, wishlistOwner: base },
    },
    orderBy: { purchasedAt: "asc" },
    select: {
      id: true,
      purchasedAt: true,
      wishlistAssignment: { select: { wishlistOwner: { select: { id: true, email: true } } } },
    },
    take: BATCH * 5,
  });
  const seen = new Set<string>();
  for (const gift of gifts) {
    const owner = gift.wishlistAssignment.wishlistOwner;
    if (seen.has(owner.id) || run.giftCheckIns >= BATCH) continue;
    seen.add(owner.id);
    const [thanked, recent] = await Promise.all([
      db.kudos.count({ where: { userId: owner.id, createdAt: { gte: gift.purchasedAt } } }),
      db.emailLog.count({
        where: {
          userId: owner.id,
          kind: "GIFT_CHECK_IN",
          createdAt: { gte: new Date(now.getTime() - GIFT_LATEST_DAYS * DAY) },
        },
      }),
    ]);
    if (thanked || recent) continue;
    const r = await sendOnce(
      db,
      { id: owner.id, email: owner.email! },
      "GIFT_CHECK_IN",
      season,
      () => giftCheckIn(owner.id, season, gift.id),
      gift.id,
    );
    if (r !== "DUPLICATE") run.giftCheckIns++;
  }

  run.newLists = await sendNewLists(db, base, season, w, now);
  return run;
}

/** The weekly "new wishlists to pick up" email; returns how many went. */
async function sendNewLists(
  db: PrismaClient,
  base: Prisma.UserWhereInput,
  season: number,
  w: { opensAt: Date; closesAt: Date },
  now: Date,
) {
  if (now > w.closesAt) return 0;
  const inWindow = now >= w.opensAt;
  // groups people can pick up in right now (before the season: opened early)
  const open: Prisma.GroupWhereInput = inWindow
    ? { status: "ACTIVE" }
    : { status: "ACTIVE", OR: [{ openEarlySeason: season }, { parent: { openEarlySeason: season } }] };
  const lastWeek = new Date(now.getTime() - NEW_LISTS_EVERY_DAYS * DAY);
  const santas = await db.user.findMany({
    where: {
      ...base,
      assignedLinks: { some: { season } },
      memberships: { some: { group: open } },
      emailLog: { none: { kind: { in: ["NEW_LISTS", "SEASON_OPEN"] }, createdAt: { gte: lastWeek } } },
    },
    select: {
      id: true,
      email: true,
      emailLog: { where: { kind: "NEW_LISTS" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { id: "asc" },
    take: BATCH,
  });
  let sent = 0;
  for (const u of santas) {
    const last = u.emailLog[0]?.createdAt;
    const since = last && last > lastWeek ? last : lastWeek;
    const fresh = await db.membership.findMany({
      where: {
        group: { ...open, memberships: { some: { userId: u.id } } },
        userId: { not: u.id },
        user: { amazonWishlistUrl: { not: null }, seasonCheckIns: { some: { season } } },
        // joined, or checked in for this Christmas, since the last email
        OR: [{ joinedAt: { gt: since } }, { user: { seasonCheckIns: { some: { season, createdAt: { gt: since } } } } }],
      },
      select: { userId: true, group: { select: { name: true, kind: true, parent: { select: { name: true } } } } },
    });
    // only lists still waiting for a first gift, and not already theirs to gift
    const owners = [...new Set(fresh.map((m) => m.userId))];
    const taken = await db.wishlistAssignment.findMany({
      where: {
        season,
        wishlistOwnerId: { in: owners },
        OR: [{ assignedUserId: u.id }, { purchases: { isNot: null } }],
      },
      select: { wishlistOwnerId: true },
    });
    const skip = new Set(taken.map((a) => a.wishlistOwnerId));
    const waiting = fresh.filter((m) => !skip.has(m.userId));
    const people = new Set(waiting.map((m) => m.userId));
    if (people.size === 0) continue;
    // a team's lists are its workplace's
    const groups = [...new Set(waiting.map((m) => (m.group.kind === "TEAM" ? m.group.parent?.name : null) ?? m.group.name))];
    const r = await sendOnce(
      db,
      { id: u.id, email: u.email! },
      "NEW_LISTS",
      season,
      () => newLists(u.id, season, people.size, groups, w.closesAt),
      now.toISOString().slice(0, 10),
    );
    if (r !== "DUPLICATE") sent++;
  }
  return sent;
}

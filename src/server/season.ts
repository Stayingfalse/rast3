import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";

import { seasonRange, seasonYearOf } from "~/server/stamps";

/**
 * Day 18: the Christmas season. A season is the stamps' year (1 Aug to
 * 31 Jul); gifting inside it opens and closes on the Season table's dates
 * (default 15 Nov to 6 Jan). Every member checks in once a season (owner,
 * 19 Oct) before they pick up or are handed out, and pick-ups from earlier
 * seasons are archived so last year's lists are never held or passed on.
 *
 * Gift pages (/gift/...) deliberately ignore all of this: they stay live for
 * their season whatever the dates, check-ins or archiving say.
 */
type Db = Pick<PrismaClient, "season" | "seasonCheckIn" | "group" | "wishlistAssignment">;

export const currentSeason = () => seasonYearOf(new Date());

/** This season's gifting window, falling back to 15 Nov to 6 Jan. */
export async function seasonWindow(db: Db, year = currentSeason()) {
  const row = await db.season.findUnique({ where: { year } });
  return {
    year,
    opensAt: row?.opensAt ?? new Date(Date.UTC(year, 10, 15)),
    closesAt: row?.closesAt ?? new Date(Date.UTC(year + 1, 0, 6, 23, 59, 59)),
  };
}

/**
 * Can people pick up in this group now? Inside the season's dates, or any
 * time for a group (or a team's workplace) a site admin opened early.
 */
export async function giftingOpen(db: Db, groupId: string | null, now = new Date()) {
  const w = await seasonWindow(db);
  if (now >= w.opensAt && now <= w.closesAt) return true;
  if (!groupId) return false;
  const season = currentSeason();
  const g = await db.group.findUnique({
    where: { id: groupId },
    select: { openEarlySeason: true, parent: { select: { openEarlySeason: true } } },
  });
  return g?.openEarlySeason === season || g?.parent?.openEarlySeason === season;
}

/** Is the season's gifting window open right now? */
export async function inSeasonWindow(db: Db, now = new Date()) {
  const w = await seasonWindow(db);
  return now >= w.opensAt && now <= w.closesAt;
}

/** Prisma filter: people who have checked in this season. */
export const checkedIn = (season = currentSeason()): Prisma.UserWhereInput => ({
  seasonCheckIns: { some: { season } },
});

export async function hasCheckedIn(db: Db, userId: string, season = currentSeason()) {
  return !!(await db.seasonCheckIn.findUnique({
    where: { userId_season: { userId, season } },
    select: { userId: true },
  }));
}

export async function checkIn(db: Db, userId: string, season = currentSeason()) {
  await db.seasonCheckIn.upsert({
    where: { userId_season: { userId, season } },
    update: {},
    create: { userId, season },
  });
}

/** Pick-ups from earlier seasons: archived and no longer held. */
export async function archivePastSeasons(db: Db) {
  const { gte } = seasonRange(currentSeason());
  await db.wishlistAssignment.updateMany({
    where: { assignedAt: { lt: gte }, OR: [{ isActive: true }, { archived: false }] },
    data: { isActive: false, archived: true },
  });
}

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

/**
 * Throws unless this person may pick up wishlists in this group (or their
 * workplace, for workplace pick-ups) right now.
 */
export async function requireCanPickUp(db: Db, userId: string, groupId: string | null) {
  const season = currentSeason();
  if (!(await hasCheckedIn(db, userId, season))) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Check in for Christmas ${season} first: confirm your wishlist and groups.`,
    });
  }
  if (!(await giftingOpen(db, groupId))) {
    const w = await seasonWindow(db, season);
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        new Date() < w.opensAt
          ? `Gifting opens on ${day(w.opensAt)}. Get your wishlist ready until then.`
          : `Gifting closed on ${day(w.closesAt)}. See you next Christmas!`,
    });
  }
  await archivePastSeasons(db);
}

export type SeasonPhase = "before" | "open" | "after";

/** For the public pages: where the season stands, and its dates. */
export async function publicSeason(db: Db, now = new Date()) {
  const w = await seasonWindow(db);
  const phase: SeasonPhase = now < w.opensAt ? "before" : now <= w.closesAt ? "open" : "after";
  return { phase, opensAt: w.opensAt, closesAt: w.closesAt };
}

/** "15 November", in UK time. */
export const ukDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

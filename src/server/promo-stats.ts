import type { PrismaClient } from "@prisma/client";

import { ukYmd } from "~/lib/last-order";
import { seasonCountdowns, seasonPhase } from "~/lib/promo-season";
import { roundForPublic } from "~/server/public-stats";
import { checkedIn, driveStartsAt, seasonWindow } from "~/server/season";
import { seasonRange, seasonYearOf } from "~/server/stamps";

/**
 * Figures for the promo channel's videos (docs/roadmap.md, 17 Nov). Only
 * site-wide counts, each rounded as the home page rounds them (under 10 is
 * hidden; otherwise floored to 10, or to 50 past 1,000), and the season's
 * dates. Never names, never one group's numbers, never a raw count.
 */
type Db = Pick<
  PrismaClient,
  | "user"
  | "purchase"
  | "kudos"
  | "group"
  | "season"
  | "seasonCheckIn"
  | "wishlistAssignment"
>;

const WEEK = 7 * 86_400_000;

export async function getPromoStats(db: Db, now = new Date()) {
  const season = seasonYearOf(now);
  const w = await seasonWindow(db, season);
  const drive = driveStartsAt(w.year);
  const inSeason = { wishlistAssignment: { season } };
  const since = new Date(now.getTime() - WEEK);
  const active = (kind: "ORG" | "COMMUNITY" | "FRIENDS") =>
    db.group.count({ where: { kind, status: "ACTIVE" } });

  const [
    members,
    gifts,
    kudos,
    takingPart,
    seasonGifts,
    weekGifts,
    seasonKudos,
    workplaces,
    communities,
    friends,
  ] = await Promise.all([
    db.user.count({ where: { profileCompleted: true } }),
    db.purchase.count(),
    db.kudos.count({ where: { hidden: false } }),
    db.user.count({ where: checkedIn(season) }),
    db.purchase.count({ where: inSeason }),
    db.purchase.count({ where: { ...inSeason, purchasedAt: { gte: since } } }),
    db.kudos.count({
      where: { hidden: false, createdAt: seasonRange(season) },
    }),
    active("ORG"),
    active("COMMUNITY"),
    active("FRIENDS"),
  ]);

  const dates = {
    driveStartsAt: drive,
    opensAt: w.opensAt,
    closesAt: w.closesAt,
    lastOrderAt: w.lastOrderAt,
  };
  return {
    generatedAt: now.toISOString(),
    season: {
      year: w.year,
      phase: seasonPhase(now, dates),
      driveStartsOn: ukYmd(drive),
      opensOn: ukYmd(w.opensAt),
      closesOn: ukYmd(w.closesAt),
      lastOrderOn: w.lastOrderAt ? ukYmd(w.lastOrderAt) : null,
      ...seasonCountdowns(now, dates),
    },
    /** Since the site began */
    allTime: {
      members: roundForPublic(members),
      gifts: roundForPublic(gifts),
      thankYous: roundForPublic(kudos),
    },
    /** This season (1 August to 31 July) */
    thisSeason: {
      membersTakingPart: roundForPublic(takingPart),
      gifts: roundForPublic(seasonGifts),
      giftsLast7Days: roundForPublic(weekGifts),
      thankYous: roundForPublic(seasonKudos),
    },
    /** Live groups by kind (teams count under their workplace) */
    groups: {
      workplaces: roundForPublic(workplaces),
      communities: roundForPublic(communities),
      friends: roundForPublic(friends),
    },
  };
}

export type PromoStats = Awaited<ReturnType<typeof getPromoStats>>;

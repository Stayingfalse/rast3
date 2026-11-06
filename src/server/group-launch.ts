import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";

import { ukDateString, ukMidnight } from "~/lib/uk-date";
import { seasonRange } from "~/server/stamps";

/**
 * Per-group launch dates (owner, 7 Nov). Every group opens for gifting on the
 * season's date (15 November by default) unless a site admin or its
 * organiser picks another day, earlier or later: a community that joins
 * after the 15th can agree its own start. Gifting closes for everyone on the
 * season's closing date. Teams follow their workplace. A group's own date
 * only counts for the season it was set in (launchSeason), so next year
 * everyone starts from the site's date again.
 */
export type Window = { year: number; opensAt: Date; closesAt: Date };
export type LaunchFields = { launchAt: Date | null; launchSeason: number | null };
type WithParent = LaunchFields & { kind?: string; parent?: LaunchFields | null };

/** The group's own launch this season, or null when it follows the season. */
export const ownLaunch = (g: LaunchFields, season: number) =>
  g.launchSeason === season && g.launchAt ? g.launchAt : null;

/** When gifting opens in this group (a team: in its workplace). */
export function launchOf(g: WithParent, w: Window) {
  const source = g.kind === "TEAM" && g.parent ? g.parent : g;
  return ownLaunch(source, w.year) ?? w.opensAt;
}

/** Can people pick up in this group right now? */
export const isOpen = (g: WithParent, w: Window, now = new Date()) =>
  now >= launchOf(g, w) && now <= w.closesAt;

/** Prisma select for working these out (teams need their workplace's). */
export const launchSelect = {
  kind: true,
  launchAt: true,
  launchSeason: true,
  parent: { select: { launchAt: true, launchSeason: true } },
} as const;

/** Groups (not teams) that follow the season's date this season. */
const followsSeason = (season: number): Prisma.GroupWhereInput => ({
  OR: [{ launchSeason: null }, { launchSeason: { not: season } }, { launchAt: null }],
});

/** Groups (not teams) whose launch falls in [from, to]. */
function launchedBetween(w: Window, from: Date, to: Date): Prisma.GroupWhereInput {
  const seasonIn = w.opensAt >= from && w.opensAt <= to;
  return {
    OR: [
      { launchSeason: w.year, launchAt: { gte: from, lte: to } },
      ...(seasonIn ? [followsSeason(w.year)] : []),
    ],
  };
}

/** For a group of any kind: a team is judged by its workplace. */
const byKind = (where: Prisma.GroupWhereInput): Prisma.GroupWhereInput => ({
  OR: [
    { kind: { not: "TEAM" }, ...where },
    { kind: "TEAM", parent: where },
  ],
});

/** Prisma filter: groups people can pick up in right now (by date only). */
export function openNowWhere(w: Window, now = new Date()): Prisma.GroupWhereInput {
  if (now > w.closesAt) return { id: { in: [] } };
  return byKind(launchedBetween(w, new Date(0), now));
}


const ukDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });

/**
 * Sets (or with null, clears) a group's own launch date, a UK day
 * ("2026-12-01"). Site admins can pick any day of the season before gifting
 * closes. Organisers can pick today or later, and only while their group
 * hasn't opened yet: once people are picking up, moving it is a site
 * admin's call. Throws a message for people on a bad date.
 */
export async function setGroupLaunch(
  db: Pick<PrismaClient, "group">,
  w: Window,
  groupId: string,
  date: string | null,
  { by, now = new Date() }: { by: "SITE" | "ORGANISER"; now?: Date },
) {
  const g = await db.group.findUnique({ where: { id: groupId }, select: { id: true, ...launchSelect } });
  if (!g || g.kind === "TEAM") throw new TRPCError({ code: "NOT_FOUND" });
  if (by === "ORGANISER" && now >= launchOf(g, w)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your group has already opened for gifting. Ask a site admin if its date needs to change.",
    });
  }
  let launchAt: Date | null = null;
  if (date) {
    launchAt = ukMidnight(date);
    const { gte } = seasonRange(w.year);
    if (!launchAt || launchAt < gte) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Pick a day in Christmas ${w.year}.` });
    }
    if (launchAt >= w.closesAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Gifting closes on ${ukDay(w.closesAt)}, so pick a day before that.`,
      });
    }
    if (by === "ORGANISER" && date < ukDateString(now)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Pick today or a day after it." });
    }
  }
  const saved = await db.group.update({
    where: { id: g.id },
    data: launchAt ? { launchAt, launchSeason: w.year } : { launchAt: null, launchSeason: null },
    select: launchSelect,
  });
  const opensAt = launchOf(saved, w);
  return { opensAt, own: !!ownLaunch(saved, w.year), open: now >= opensAt && now <= w.closesAt };
}

/** A group's dates for its organiser console and Admin › Groups. */
export function launchInfo(g: WithParent, w: Window, now = new Date()) {
  const opensAt = launchOf(g, w);
  return {
    opensAt,
    closesAt: w.closesAt,
    siteOpensAt: w.opensAt,
    /** its own date this season (not the season's) */
    own: !!ownLaunch(g.kind === "TEAM" && g.parent ? g.parent : g, w.year),
    open: now >= opensAt && now <= w.closesAt,
  };
}

/** Prisma filter: groups with their own launch date in the last `days` days (by now). */
export function ownLaunchWithinWhere(w: Window, days: number, now = new Date()): Prisma.GroupWhereInput {
  if (now > w.closesAt) return { id: { in: [] } };
  return byKind({
    launchSeason: w.year,
    launchAt: { gte: new Date(now.getTime() - days * 24 * 3600_000), lte: now },
  });
}

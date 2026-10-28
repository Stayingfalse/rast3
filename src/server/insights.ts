import type { GroupKind, PrismaClient } from "@prisma/client";

import { seasonWindow } from "~/server/season";
import { seasonRange } from "~/server/stamps";

/**
 * Day 27: insights for the 2027 monetisation case, worked out from what the
 * site already records. Nothing new is tracked about anyone: no cookies, no
 * third parties, no events. Site admins only, and counts only (no names).
 */
const DAY = 24 * 3600_000;
const WEEK = 7 * DAY;

/** The three kinds of group people give in; a team counts as its workplace. */
export type Kind = "ORG" | "COMMUNITY" | "FRIENDS";
const KINDS: Kind[] = ["ORG", "COMMUNITY", "FRIENDS"];
const kindOf = (k: GroupKind | null | undefined): Kind =>
  k === "COMMUNITY" || k === "FRIENDS" ? k : "ORG";

/** Groups count as "taking off" with this many members in their first 48 hours. */
export const TAKE_OFF = 5;

/** Monday 00:00 UTC of the week a date falls in. */
const weekOf = (d: Date) => {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY);
};

const distinct = <T>(xs: T[]) => new Set(xs).size;

export async function seasonInsights(db: PrismaClient, year: number, now = new Date()) {
  const range = seasonRange(year);
  const window = await seasonWindow(db, year);
  const inSeason = { gte: range.gte, lt: range.lt };

  const [members, checkIns, inGroup, assignments, kudos, groups, opens, profiles, memberships] =
    await Promise.all([
      db.user.count({
        where: {
          profileCompleted: true,
          OR: [{ profileCompletedAt: null }, { profileCompletedAt: { lt: range.lt } }],
        },
      }),
      db.seasonCheckIn.findMany({ where: { season: year }, select: { createdAt: true } }),
      db.membership.findMany({
        where: { group: { kind: { not: "TEAM" } } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      db.wishlistAssignment.findMany({
        where: { season: year },
        select: {
          assignedUserId: true,
          wishlistOwnerId: true,
          assignedAt: true,
          group: { select: { kind: true } },
          purchases: { select: { userId: true, purchasedAt: true, receivedAt: true } },
        },
      }),
      db.kudos.findMany({ where: { createdAt: inSeason }, select: { userId: true, createdAt: true } }),
      db.group.findMany({
        where: { kind: { not: "TEAM" } },
        select: {
          id: true,
          kind: true,
          status: true,
          createdAt: true,
          memberships: { select: { userId: true, joinedAt: true } },
        },
      }),
      db.wishlistOpen.findMany({
        where: { season: year },
        select: { createdAt: true, tagged: true, affiliateOn: true, viaGiftPage: true, groupId: true },
      }),
      db.user.findMany({
        where: { profileCompletedAt: inSeason },
        select: { profileCompletedAt: true },
      }),
      db.membership.findMany({
        where: { joinedAt: inSeason, group: { kind: { not: "TEAM" } } },
        select: { joinedAt: true },
      }),
    ]);

  const gifts = assignments.flatMap((a) => (a.purchases ? [{ ...a.purchases, a }] : []));

  // 1. The season's funnel, one person counted once per step
  const funnel = [
    { step: "Members", count: members, note: "a finished profile by the season's end" },
    { step: "Checked in", count: checkIns.length, note: "confirmed their wishlist for this Christmas" },
    { step: "In a group", count: inGroup.length, note: "in a workplace, community or friends group now" },
    { step: "Picked up a list", count: distinct(assignments.map((a) => a.assignedUserId)), note: "" },
    { step: "Gifted", count: distinct(gifts.map((g) => g.userId)), note: "marked at least one gift" },
    { step: "Received a gift", count: distinct(gifts.map((g) => g.a.wishlistOwnerId)), note: "" },
    {
      step: "Said it arrived",
      count: distinct(gifts.filter((g) => g.receivedAt).map((g) => g.a.wishlistOwnerId)),
      note: "",
    },
    { step: "Posted a thank-you", count: distinct(kudos.map((k) => k.userId)), note: "" },
  ];

  // 2. By kind of group: where the giving happens (workplace pick-ups have no group)
  const groupKind = new Map(groups.map((g) => [g.id, kindOf(g.kind)]));
  const byKind = KINDS.map((kind) => {
    const theirs = groups.filter((g) => kindOf(g.kind) === kind);
    const picks = assignments.filter((a) => kindOf(a.group?.kind) === kind);
    const given = gifts.filter((g) => kindOf(g.a.group?.kind) === kind);
    const started = theirs.filter((g) => g.createdAt >= range.gte && g.createdAt < range.lt);
    const opened = opens.filter((o) => (o.groupId ? groupKind.get(o.groupId) : undefined) === kind);
    return {
      kind,
      groupsLive: theirs.filter((g) => g.status === "ACTIVE").length,
      groupsStarted: started.length,
      tookOff: started.filter(
        (g) =>
          g.memberships.filter((m) => m.joinedAt.getTime() <= g.createdAt.getTime() + 2 * DAY).length >=
          TAKE_OFF,
      ).length,
      members: distinct(theirs.flatMap((g) => g.memberships.map((m) => m.userId))),
      santas: distinct(given.map((g) => g.userId)),
      pickUps: picks.length,
      gifts: given.length,
      arrived: given.filter((g) => g.receivedAt).length,
      opens: opened.length,
      taggedOpens: opened.filter((o) => o.tagged).length,
    };
  });

  // 3. Week by week, from a few weeks before gifting opens to now (or the end)
  const end = new Date(Math.min(now.getTime(), window.closesAt.getTime() + WEEK, range.lt.getTime() - 1));
  const start = new Date(
    Math.max(range.gte.getTime(), Math.min(window.opensAt.getTime() - 4 * WEEK, end.getTime() - 7 * WEEK)),
  );
  const weeks: { week: string; counts: Record<string, number> }[] = [];
  for (let w = weekOf(start); w <= end; w = new Date(w.getTime() + WEEK)) {
    weeks.push({ week: w.toISOString().slice(0, 10), counts: {} });
  }
  const add = (metric: string, d: Date | null | undefined) => {
    if (!d || d < start || d > end) return;
    const row = weeks.find((r) => r.week === weekOf(d).toISOString().slice(0, 10));
    if (row) row.counts[metric] = (row.counts[metric] ?? 0) + 1;
  };
  for (const p of profiles) add("members", p.profileCompletedAt);
  for (const m of memberships) add("joins", m.joinedAt);
  for (const g of groups) add("groups", g.createdAt);
  for (const c of checkIns) add("checkIns", c.createdAt);
  for (const a of assignments) add("pickUps", a.assignedAt);
  for (const g of gifts) add("gifts", g.purchasedAt);
  for (const g of gifts) add("arrived", g.receivedAt);
  for (const k of kudos) add("thanks", k.createdAt);
  for (const o of opens) add("opens", o.createdAt);
  for (const o of opens) if (o.tagged) add("taggedOpens", o.createdAt);

  // 4. Affiliate links: opens of lists on Amazon this season
  const affiliate = {
    opens: opens.length,
    tagged: opens.filter((o) => o.tagged).length,
    viaGiftPage: opens.filter((o) => o.viaGiftPage).length,
    // links were on for the group, but the list's store has no Associates account
    missed: opens.filter((o) => o.affiliateOn && !o.tagged).length,
  };

  return {
    year,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
    funnel,
    byKind,
    weeks,
    affiliate,
  };
}

/** Seasons with any pick-ups or check-ins, plus this one, newest first. */
export async function insightSeasons(db: PrismaClient, current: number) {
  const rows = await db.wishlistAssignment.findMany({ distinct: ["season"], select: { season: true } });
  return [...new Set([current, ...rows.map((r) => r.season)])].sort((a, b) => b - a);
}

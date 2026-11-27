import type { Prisma, PrismaClient } from "@prisma/client";

import { currentSeason } from "~/server/season";

/**
 * Admin › Wishlists (owner, 27 Nov): everyone with a wishlist, once each,
 * with every group they're in (a person can be in a workplace, a Discord
 * community and a friends group at once), this season's check-in, how many
 * Santas picked their list up and gifted it, and any open problem reports.
 * The old page sorted people into "workplace › team" only, so community and
 * friends members all landed in "No company", and counted every year.
 */
export const WISHLIST_SHOW = ["all", "problems", "notCheckedIn", "notPickedUp"] as const;
export type WishlistShow = (typeof WISHLIST_SHOW)[number];
const LIMIT = 300;

export type AdminWishlistRow = {
  id: string;
  name: string;
  email: string | null;
  workEmail: string | null;
  wishlistUrl: string;
  lastSeenAt: Date | null;
  groups: { id: string; name: string; kind: string; parent: string | null }[];
  checkedIn: boolean;
  /** Santas holding this person's list this season (not unassigned) */
  pickedUp: number;
  /** of those, gifted */
  gifted: number;
  problems: { type: string; description: string | null }[];
};

const displayName = (u: { firstName: string | null; lastName: string | null; name: string | null; email: string | null }) => {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full !== "" ? full : (u.name ?? u.email ?? "(no name)");
};

export async function adminWishlists(
  db: PrismaClient,
  input: { q: string; groupId: string | null; show: WishlistShow },
  season = currentSeason(),
): Promise<{ rows: AdminWishlistRow[]; total: number; limited: boolean }> {
  const q = input.q.trim();
  const where: Prisma.UserWhereInput = {
    amazonWishlistUrl: { not: null },
    ...(q && {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { name: { contains: q } },
        { email: { contains: q } },
        { workEmail: { contains: q } },
      ],
    }),
    ...(input.groupId && { memberships: { some: { groupId: input.groupId } } }),
    ...(input.show === "notCheckedIn" && { seasonCheckIns: { none: { season } } }),
    ...(input.show === "problems" && {
      ownedWishlist: { some: { season, reports: { some: { resolved: false } } } },
    }),
    ...(input.show === "notPickedUp" && {
      seasonCheckIns: { some: { season } },
      ownedWishlist: { none: { season, isActive: true } },
    }),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: LIMIT,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        workEmail: true,
        amazonWishlistUrl: true,
        lastSeenAt: true,
        seasonCheckIns: { where: { season }, select: { season: true } },
        memberships: {
          select: { group: { select: { id: true, name: true, kind: true, parent: { select: { name: true } } } } },
        },
        ownedWishlist: {
          where: { season, isActive: true },
          select: {
            purchases: { select: { id: true } },
            reports: { where: { resolved: false }, select: { reportType: true, description: true } },
          },
        },
      },
    }),
  ]);
  const kindOrder: Record<string, number> = { ORG: 0, TEAM: 1, COMMUNITY: 2, FRIENDS: 3 };
  const rows = users.map((u) => ({
    id: u.id,
    name: displayName(u),
    email: u.email,
    workEmail: u.workEmail,
    wishlistUrl: u.amazonWishlistUrl!,
    lastSeenAt: u.lastSeenAt,
    groups: u.memberships
      .map((m) => ({ id: m.group.id, name: m.group.name, kind: m.group.kind, parent: m.group.parent?.name ?? null }))
      .sort((a, b) => (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9) || a.name.localeCompare(b.name)),
    checkedIn: u.seasonCheckIns.length > 0,
    pickedUp: u.ownedWishlist.length,
    gifted: u.ownedWishlist.filter((a) => a.purchases).length,
    problems: u.ownedWishlist.flatMap((a) =>
      a.reports.map((r) => ({ type: r.reportType, description: r.description })),
    ),
  }));
  // problems first: they're what an admin acts on
  rows.sort((a, b) => Number(b.problems.length > 0) - Number(a.problems.length > 0));
  return { rows, total, limited: total > LIMIT };
}

/** Every group, for the filter: workplaces with their teams, then communities and friends groups. */
export async function adminWishlistGroups(db: PrismaClient) {
  const groups = await db.group.findMany({
    where: { status: { not: "DISABLED" } },
    select: { id: true, name: true, kind: true, parent: { select: { name: true } }, _count: { select: { memberships: true } } },
    orderBy: { name: "asc" },
  });
  return groups.map((g) => ({
    id: g.id,
    kind: g.kind,
    label: g.parent ? `${g.parent.name} › ${g.name}` : g.name,
    members: g._count.memberships,
  }));
}

import type { Prisma, PrismaClient } from "@prisma/client";

import { currentSeason } from "~/server/season";
import { seasonRange } from "~/server/stamps";

/**
 * Friends groups go live as soon as they're started (owner, 6 Nov), so the
 * 15 Nov rush doesn't queue behind one site admin. Workplaces and
 * communities still wait for approval.
 *
 * Friends groups are meant to be small (friends and family). One that grows
 * past LARGE_FRIENDS_GROUP members stays live and anyone can still join, but
 * it's listed on Admin › Approvals for a site admin to look at (and close if
 * it isn't really a friends group). Nothing is stored for the flag: it's
 * simply every live friends group over the size.
 */
export const LARGE_FRIENDS_GROUP = 15;
/** Abuse guard: friends groups one person can start each season. */
export const MAX_FRIENDS_PER_SEASON = 5;
/** Admin › Approvals lists friends groups started this recently. */
export const RECENT_FRIENDS_DAYS = 7;

type Db = Pick<PrismaClient, "group" | "membership">;

/** Ids of live friends groups with more than LARGE_FRIENDS_GROUP members. */
export async function largeFriendsGroupIds(
  db: Db,
  where: Prisma.GroupWhereInput = {},
) {
  const rows = await db.membership.groupBy({
    by: ["groupId"],
    where: { group: { ...where, kind: "FRIENDS", status: "ACTIVE" } },
    having: { groupId: { _count: { gt: LARGE_FRIENDS_GROUP } } },
  });
  return rows.map((r) => r.groupId);
}

/** Friends groups this person has started this season. */
export function friendsStartedThisSeason(db: Db, userId: string) {
  return db.group.count({
    where: {
      kind: "FRIENDS",
      createdById: userId,
      createdAt: seasonRange(currentSeason()),
    },
  });
}

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

import { currentSeason } from "~/server/season";

/**
 * Day 19: fair-share hand-outs. Every pick-up route chooses from its eligible
 * wishlists the same way, so nobody is left out:
 *   1. fewest gifts received this season first,
 *   2. then fewest people holding the list right now (picked up, not gifted),
 *   3. then at random, so ties don't always favour the same person.
 * And nobody hoards: one person holds at most HOLD_LIMIT un-gifted lists at a
 * time, across all their groups.
 */
export const HOLD_LIMIT = 5;

/** Fields to select on each candidate owner (User) for `pickFairly`. */
export const fairShareFields = (season = currentSeason()) => ({
  id: true,
  ownedWishlist: {
    where: { season },
    select: { isActive: true, purchases: { select: { id: true } } },
  },
});

type Candidate = {
  id: string;
  ownedWishlist: { isActive: boolean; purchases: { id: string } | null }[];
};

/** Up to `n` candidates, fairest first (see above). */
export function pickFairly<T extends Candidate>(candidates: T[], n: number): T[] {
  return candidates
    .map((c) => ({
      c,
      gifts: c.ownedWishlist.filter((a) => a.purchases).length,
      holders: c.ownedWishlist.filter((a) => a.isActive && !a.purchases).length,
      r: Math.random(),
    }))
    .sort((a, b) => a.gifts - b.gifts || a.holders - b.holders || a.r - b.r)
    .slice(0, Math.max(0, n))
    .map((x) => x.c);
}

/**
 * Un-gifted lists this person holds right now, across all groups. Archiving a
 * list doesn't hand it back (pre-launch review, 26 Oct: it was a way round
 * the limit); a list they reported as broken doesn't count, as it can't be
 * handed back until the report is cleared.
 */
export async function holding(db: Pick<PrismaClient, "wishlistAssignment">, userId: string) {
  return db.wishlistAssignment.count({
    where: { assignedUserId: userId, isActive: true, purchases: null, reports: { none: { resolved: false } } },
  });
}

/**
 * How many more lists this person may pick up now (at most `wanted`).
 * Throws when they're already holding the limit.
 */
export async function roomToPickUp(
  db: Pick<PrismaClient, "wishlistAssignment">,
  userId: string,
  wanted: number,
) {
  const room = HOLD_LIMIT - (await holding(db, userId));
  if (room <= 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `You're holding ${HOLD_LIMIT} wishlists you haven't gifted yet. Gift one or hand one back to pick up more.`,
    });
  }
  return Math.min(room, wanted);
}

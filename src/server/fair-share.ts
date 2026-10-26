import { currentSeason } from "~/server/season";

/**
 * Day 19: fair-share hand-outs. Every pick-up route chooses from its eligible
 * wishlists the same way, so nobody is left out:
 *   1. fewest gifts received this season first,
 *   2. then fewest people holding the list right now (picked up, not gifted),
 *   3. then at random, so ties don't always favour the same person.
 * There's no cap on how many lists one person holds (owner, 26 Oct): people
 * can pick up and gift as many as they like.
 */

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

import { unstable_cache } from "next/cache";

import { db } from "~/server/db";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger("public-stats");

export interface PublicTotals {
  members: string | null;
  gifts: string | null;
  kudos: string | null;
}

/**
 * Round a count for public display so no small group can be identified.
 * Under 10 is hidden; otherwise floor to the nearest 10 (50 above 1000).
 */
export function roundForPublic(count: number): string | null {
  if (count < 10) return null;
  const step = count >= 1000 ? 50 : 10;
  return `${(Math.floor(count / step) * step).toLocaleString("en-GB")}+`;
}

/** Site-wide aggregate counts only. Never names, never per-organisation. */
export const getPublicTotals = unstable_cache(
  async (): Promise<PublicTotals> => {
    try {
      const [members, gifts, kudos] = await Promise.all([
        db.user.count({ where: { profileCompleted: true } }),
        db.purchase.count(),
        db.kudos.count({ where: { hidden: false } }),
      ]);
      return {
        members: roundForPublic(members),
        gifts: roundForPublic(gifts),
        kudos: roundForPublic(kudos),
      };
    } catch (error) {
      logger.warn({ error }, "Public totals unavailable");
      return { members: null, gifts: null, kudos: null };
    }
  },
  ["public-totals"],
  { revalidate: 600 },
);

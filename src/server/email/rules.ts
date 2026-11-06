import type { Prisma } from "@prisma/client";

import { seasonRange } from "~/server/stamps";
import type { sendOnce } from "./mailer";

/**
 * Rules every reminder run shares (./reminders, ./launch), in a module of
 * their own so Admin › Status can read the limit without importing the runs.
 */

/**
 * Reminders sent in any 24 hours, at most (27 Oct). They share a mailbox with
 * sign-in links (a free Gmail account sends about 500 a day), so they must
 * never use up its allowance; the rest wait for the next run.
 */
export const REMINDER_DAILY_LIMIT = Number(process.env.REMINDER_DAILY_LIMIT ?? 300);

/** failed sends are logged (3 Nov) but don't count as having had the email */
export const counted = { status: { not: "FAILED" } } as const;

/** sendOnce, or "HELD" when today's limit is reached (tried again next run) */
export type Send = (...args: Parameters<typeof sendOnce>) => Promise<Awaited<ReturnType<typeof sendOnce>> | "HELD">;

/**
 * Only people who have joined in this Christmas get reminders (owner, 26 Oct):
 * they checked in for this season, or signed up during it. Last year's
 * members never agreed to how we handle data now, so they hear nothing
 * until they come back and check in.
 */
export const engagedThisSeason = (season: number): Prisma.UserWhereInput => ({
  OR: [
    { seasonCheckIns: { some: { season } } },
    { profileCompletedAt: { gte: seasonRange(season).gte } },
  ],
});

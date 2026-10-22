import type { Prisma, PrismaClient } from "@prisma/client";

import { seasonWindow } from "~/server/season";
import { sendOnce } from "./mailer";
import { checkInNudge, seasonOpen } from "./templates";

/**
 * Reminder emails (22 Oct), run hourly (src/instrumentation.ts):
 * - from two weeks before gifting opens, members who haven't checked in for
 *   this Christmas are asked to (otherwise their list isn't handed out);
 * - in gifting's first week, members from before it opened hear it's open.
 * Each goes once per person per season; anyone can opt out.
 */
export const NUDGE_DAYS = 14;
const OPEN_DAYS = 7;
/** per kind per run, to stay well inside SMTP sending limits */
const BATCH = 100;
const DAY = 24 * 3600_000;

export type ReminderRun = { season: number; nudged: number; opened: number };

export async function runReminders(
  db: PrismaClient,
  { now = new Date(), only }: { now?: Date; only?: Prisma.UserWhereInput } = {},
): Promise<ReminderRun> {
  const w = await seasonWindow(db);
  const season = w.year;
  const base: Prisma.UserWhereInput = {
    emailReminders: true,
    email: { not: null },
    profileCompleted: true,
    ...(only && { AND: [only] }),
  };
  const run: ReminderRun = { season, nudged: 0, opened: 0 };

  if (now < w.opensAt && now.getTime() >= w.opensAt.getTime() - NUDGE_DAYS * DAY) {
    const users = await db.user.findMany({
      where: {
        ...base,
        seasonCheckIns: { none: { season } },
        emailLog: { none: { kind: "CHECK_IN_NUDGE", season } },
      },
      select: { id: true, email: true },
      orderBy: { id: "asc" },
      take: BATCH,
    });
    for (const u of users) {
      const r = await sendOnce(db, { id: u.id, email: u.email! }, "CHECK_IN_NUDGE", season, () =>
        checkInNudge(u.id, season, w.opensAt),
      );
      if (r !== "DUPLICATE") run.nudged++;
    }
  }

  const openUntil = Math.min(w.opensAt.getTime() + OPEN_DAYS * DAY, w.closesAt.getTime());
  if (now >= w.opensAt && now.getTime() <= openUntil) {
    const users = await db.user.findMany({
      where: {
        ...base,
        // joined before it opened (older profiles have no date)
        OR: [{ profileCompletedAt: null }, { profileCompletedAt: { lt: w.opensAt } }],
        emailLog: { none: { kind: "SEASON_OPEN", season } },
      },
      select: { id: true, email: true, seasonCheckIns: { where: { season }, select: { season: true } } },
      orderBy: { id: "asc" },
      take: BATCH,
    });
    for (const u of users) {
      const r = await sendOnce(db, { id: u.id, email: u.email! }, "SEASON_OPEN", season, () =>
        seasonOpen(u.id, season, w.closesAt, u.seasonCheckIns.length > 0),
      );
      if (r !== "DUPLICATE") run.opened++;
    }
  }
  return run;
}

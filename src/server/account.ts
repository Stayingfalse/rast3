import type { Prisma, PrismaClient } from "@prisma/client";

import { deleteFromE2 } from "~/server/utils/e2-upload";
import { createChildLogger } from "~/utils/logger";

/**
 * Day 30: a member's own data. Download it (export), delete it (delete), and
 * accounts unused for 24 months are deleted automatically, as the privacy
 * policy says (owner, 18 Oct).
 */
const log = createChildLogger("account");
const DAY = 24 * 3600_000;

/** Accounts not signed into for this long are deleted. */
export const INACTIVE_MONTHS = 24;
/** At most this many are deleted per run, so a mistake can't empty the site. */
const DELETE_BATCH = 50;

const photos = (images: string): string[] => {
  try {
    const list: unknown = JSON.parse(images);
    return Array.isArray(list) ? list.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
};

/**
 * Deletes an account and everything that's theirs: profile, sign-ins,
 * memberships, pick-ups, gifts, thank-yous (and their photos), check-ins,
 * share cards and the email log. Wishlists they shared go too, with the
 * gifts marked on them. Groups they started stay for the other members.
 */
export async function deleteAccount(db: PrismaClient, userId: string) {
  const kudos = await db.kudos.findMany({ where: { userId }, select: { images: true } });
  await db.$transaction([
    // things that point at them without deleting with them
    db.kudos.updateMany({ where: { moderatedBy: userId }, data: { moderatedBy: null } }),
    db.giftPage.updateMany({ where: { ownerId: userId }, data: { wishlistUrl: null } }),
    db.post.deleteMany({ where: { createdById: userId } }),
    db.legacyUserOrg.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  // thank-you photos live in object storage, not the database
  await Promise.all(kudos.flatMap((k) => photos(k.images)).map((url) => deleteFromE2(url)));
}

/** Why an account can't delete itself, or null if it can. */
export async function cantDelete(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { adminLevel: true, _count: { select: { createdAuthProviders: true } } },
  });
  if (!user) return "No such account";
  if (user.adminLevel === "SITE" || user._count.createdAuthProviders > 0) {
    return "Site admins can't delete their own account: ask another site admin to remove your admin access first.";
  }
  return null;
}

/**
 * Everything the site holds about one member, for them to download. Other
 * people stay anonymous: the lists you picked up and the gifts sent to you
 * don't name anyone.
 */
export async function exportAccount(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      amazonWishlistUrl: true,
      wishlistViews: true,
      profileCompleted: true,
      profileCompletedAt: true,
      emailReminders: true,
      adminLevel: true,
      lastSeenAt: true,
      ageConfirmedAt: true,
      accounts: { select: { provider: true, type: true } },
      _count: { select: { sessions: true } },
      memberships: {
        select: { role: true, joinedAt: true, group: { select: { name: true, kind: true } } },
      },
      seasonCheckIns: { select: { season: true, createdAt: true } },
      assignedLinks: {
        select: {
          season: true,
          assignedAt: true,
          isActive: true,
          group: { select: { name: true } },
          purchases: { select: { purchasedAt: true, receivedAt: true, notes: true } },
        },
      },
      ownedWishlist: {
        select: {
          season: true,
          assignedAt: true,
          purchases: { select: { purchasedAt: true, receivedAt: true } },
        },
      },
      kudosGiven: { select: { message: true, images: true, createdAt: true, hidden: true } },
      reports: { select: { reportType: true, description: true, reportedAt: true, resolved: true } },
      shareCards: { select: { kind: true, views: true, createdAt: true } },
      createdGroups: { select: { name: true, kind: true, createdAt: true } },
      emailLog: { select: { kind: true, season: true, status: true, createdAt: true } },
    },
  });
  if (!user) return null;
  const { accounts, _count, memberships, assignedLinks, ownedWishlist, kudosGiven, ...profile } = user;
  return {
    exportedAt: new Date(),
    about:
      "Everything Random Acts of Santa holds about you. Other people aren't named: the lists you picked up and the gifts sent to you stay anonymous. Questions: privacy@raosanta.uk",
    profile,
    signIns: { methods: accounts, activeSessions: _count.sessions },
    groups: memberships.map((m) => ({ name: m.group.name, kind: m.group.kind, role: m.role, joinedAt: m.joinedAt })),
    checkIns: user.seasonCheckIns,
    listsYouPickedUp: assignedLinks.map((a) => ({
      season: a.season,
      pickedUpAt: a.assignedAt,
      stillHolding: a.isActive && !a.purchases,
      group: a.group?.name ?? null,
      gift: a.purchases,
    })),
    giftsSentToYou: ownedWishlist
      .filter((a) => a.purchases)
      .map((a) => ({ season: a.season, sentAt: a.purchases!.purchasedAt, arrivedAt: a.purchases!.receivedAt })),
    timesYourListWasPickedUp: ownedWishlist.length,
    thankYous: kudosGiven.map((k) => ({ ...k, images: photos(k.images) })),
    wishlistReports: user.reports,
    shareCards: user.shareCards,
    groupsYouStarted: user.createdGroups,
    reminderEmails: user.emailLog,
  };
}

/**
 * Deletes accounts nobody has signed into for 24 months. Site admins are
 * kept. Runs with the hourly schedule; a batch at a time. `only` narrows it
 * (the e2e tests run it on their own users).
 */
export async function deleteInactiveAccounts(
  db: PrismaClient,
  { now = new Date(), only }: { now?: Date; only?: Prisma.UserWhereInput } = {},
) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - INACTIVE_MONTHS);
  const stale = await db.user.findMany({
    where: { lastSeenAt: { lt: cutoff }, adminLevel: { not: "SITE" }, ...(only ? { AND: [only] } : {}) },
    select: { id: true },
    take: DELETE_BATCH,
  });
  let deleted = 0;
  for (const { id } of stale) {
    try {
      await deleteAccount(db, id);
      deleted++;
    } catch (error) {
      log.error({ error: error instanceof Error ? error.message : String(error) }, "Inactive account deletion failed");
    }
  }
  if (deleted) log.info({ deleted, cutoff }, "Deleted accounts unused for 24 months");
  return { deleted, cutoff };
}

/** Records that a member is using the site, at most once a day. */
export async function touchLastSeen(db: PrismaClient, userId: string, lastSeenAt: Date | null | undefined) {
  const now = new Date();
  if (lastSeenAt && now.getTime() - new Date(lastSeenAt).getTime() < DAY) return;
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: now } }).catch(() => undefined);
}

import type { MembershipRole, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { createChildLogger } from "~/utils/logger";
import { getWorkplace, leaveWorkplace } from "~/server/groups";
import { currentSeason } from "~/server/season";
import { seasonRange } from "~/server/stamps";

/**
 * A work email belongs to one account. Returning members (owner, 17 Nov)
 * often sign in a different way from last year (company mail blocks our
 * sign-in links, so the page suggests a personal address or a social
 * account), which makes a new account, and their work email is still on
 * last year's. So:
 *
 * - When the account holding it hasn't been used this season (not signed
 *   in since 1 August and not checked in), the work email moves to the new
 *   account, with its workplace role and team. Last year's account keeps
 *   everything else; it's simply no longer in the workplace.
 * - When it has been used this season, the person is told how they signed
 *   in with it (the provider, and the address masked), so they can use that.
 */
const log = createChildLogger("work-email");

export type Claimed = { role: MembershipRole; teamId: string | null } | null;

/** "pat@gmail.com" -> "p•••@gmail.com" */
export const maskEmail = (email: string) => {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain}`;
};

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  discord: "Discord",
  twitch: "Twitch",
  github: "GitHub",
  reddit: "Reddit",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

/**
 * Makes `email` free for `userId`, moving it off an account that hasn't been
 * used this season. Returns that account's workplace role and team (to carry
 * over), or null when nothing moved. Throws CONFLICT when it can't.
 */
export async function claimWorkEmail(
  db: PrismaClient,
  email: string,
  userId: string,
): Promise<Claimed> {
  const owner = await db.user.findUnique({
    where: { workEmail: email },
    select: {
      id: true,
      email: true,
      lastSeenAt: true,
      adminLevel: true,
      accounts: { select: { provider: true }, take: 1 },
      seasonCheckIns: { where: { season: currentSeason() }, select: { season: true }, take: 1 },
    },
  });
  if (!owner || owner.id === userId) return null;

  const seasonStart = seasonRange(currentSeason()).gte;
  const seenThisSeason = !!owner.lastSeenAt && owner.lastSeenAt >= seasonStart;
  const usedThisSeason = seenThisSeason || owner.seasonCheckIns.length > 0 || owner.adminLevel === "SITE";
  if (usedThisSeason) {
    const provider = owner.accounts[0]?.provider;
    const how = provider
      ? `${PROVIDER_NAMES[provider] ?? provider}${owner.email ? ` (${maskEmail(owner.email)})` : ""}`
      : owner.email
        ? `an email link to ${maskEmail(owner.email)}`
        : null;
    throw new TRPCError({
      code: "CONFLICT",
      message: how
        ? `That work email is already on another account this Christmas. Sign out, then sign in with ${how} instead.`
        : "That work email is already on another account this Christmas. Sign in with that account instead.",
    });
  }

  // last year's account: hand the work email (and workplace) over
  const { org, team } = await getWorkplace(db, owner.id);
  const carried: Claimed = { role: org?.role ?? "MEMBER", teamId: team?.group.id ?? null };
  await db.user.update({ where: { id: owner.id }, data: { workEmail: null } });
  await leaveWorkplace(db, owner.id);
  await db.wishlistAssignment.updateMany({
    where: { assignedUserId: owner.id, isActive: true, groupId: null },
    data: { isActive: false },
  });
  log.info(
    { from: owner.id, to: userId, lastSeenAt: owner.lastSeenAt, role: carried.role },
    "Work email moved from an account not used this season",
  );
  return carried;
}

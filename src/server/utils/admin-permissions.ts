import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";

/**
 * Who can moderate: site admins everywhere, and organisers (ADMIN members of
 * a workplace or team) for the people in the groups they run.
 */
export type ModeratorLevel = "USER" | "ORGANISER" | "SITE";

export async function adminGroupIds(userId: string): Promise<string[]> {
  const rows = await db.membership.findMany({
    where: { userId, role: "ADMIN", group: { kind: { in: ["ORG", "TEAM"] } } },
    select: { groupId: true },
  });
  return rows.map((r) => r.groupId);
}

/** Users in any of these groups (an empty list matches nobody). */
export const inAnyGroup = (groupIds: string[]): Prisma.UserWhereInput => ({
  memberships: { some: { groupId: { in: groupIds } } },
});

async function isInGroups(userId: string, groupIds: string[]) {
  if (groupIds.length === 0) return false;
  const hit = await db.membership.findFirst({
    where: { userId, groupId: { in: groupIds } },
    select: { id: true },
  });
  return !!hit;
}

/**
 * Check if a user has admin permissions to moderate content within their scope
 */
export async function checkAdminPermissions(
  userId: string,
  targetUserId?: string,
): Promise<{
  canModerate: boolean;
  adminLevel: ModeratorLevel;
  groupIds?: string[];
}> {
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { adminLevel: true },
  });
  if (!currentUser) return { canModerate: false, adminLevel: "USER" };

  if (currentUser.adminLevel === "SITE") {
    return { canModerate: true, adminLevel: "SITE" };
  }

  const groupIds = await adminGroupIds(userId);
  if (groupIds.length === 0) return { canModerate: false, adminLevel: "USER" };

  if (!targetUserId) return { canModerate: true, adminLevel: "ORGANISER", groupIds };
  return {
    canModerate: await isInGroups(targetUserId, groupIds),
    adminLevel: "ORGANISER",
    groupIds,
  };
}

import { db } from "~/server/db";

export type AdminLevel = "USER" | "DEPARTMENT" | "DOMAIN" | "SITE";

export interface AdminUser {
  id: string;
  adminLevel: AdminLevel;
  adminScope?: string | null;
  domain?: string | null;
  departmentId?: string | null;
}

/**
 * Check if a user has admin permissions to moderate content within their scope
 */
export async function checkAdminPermissions(
  userId: string,
  targetUserId?: string,
): Promise<{ canModerate: boolean; adminLevel: AdminLevel; scope?: string }> {
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      adminLevel: true,
      adminScope: true,
      domain: true,
      departmentId: true,
    },
  });
  if (!currentUser?.adminLevel || currentUser.adminLevel === "USER") {
    return { canModerate: false, adminLevel: "USER" };
  }

  // SITE admins can moderate everything
  if (currentUser.adminLevel === "SITE") {
    return {
      canModerate: true,
      adminLevel: currentUser.adminLevel,
      scope: "site",
    };
  }
  // If no target user specified, just return their admin status
  if (!targetUserId) {
    return {
      canModerate: true,
      adminLevel: currentUser.adminLevel,
      scope: currentUser.adminScope ?? undefined,
    };
  }

  // Get target user's information for scope checking
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: {
      domain: true,
      departmentId: true,
    },
  });

  if (!targetUser) {
    return { canModerate: false, adminLevel: currentUser.adminLevel };
  }
  // DOMAIN admins can moderate users in their domain
  if (currentUser.adminLevel === "DOMAIN") {
    const canModerate = currentUser.adminScope === targetUser.domain;
    return {
      canModerate,
      adminLevel: currentUser.adminLevel,
      scope: currentUser.adminScope ?? undefined,
    };
  }
  // DEPARTMENT admins can moderate users in their department
  if (currentUser.adminLevel === "DEPARTMENT") {
    const canModerate = currentUser.adminScope === targetUser.departmentId;
    return {
      canModerate,
      adminLevel: currentUser.adminLevel,
      scope: currentUser.adminScope ?? undefined,
    };
  }

  return { canModerate: false, adminLevel: currentUser.adminLevel };
}

/**
 * Check if user can see admin actions (has any admin level)
 */
export function canSeeAdminActions(adminLevel?: AdminLevel): boolean {
  return adminLevel
    ? ["DEPARTMENT", "DOMAIN", "SITE"].includes(adminLevel)
    : false;
}

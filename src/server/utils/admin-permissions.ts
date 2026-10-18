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

const RANK: Record<AdminLevel, number> = {
  USER: 0,
  DEPARTMENT: 1,
  DOMAIN: 2,
  SITE: 3,
};

/**
 * Can this admin act on that user? SITE admins can act on anyone; domain and
 * department admins only on people in their scope who rank below them, so
 * they can't remove or demote fellow or more senior organisers.
 */
export async function canManageUser(
  admin: AdminUser,
  targetUserId: string,
): Promise<boolean> {
  if (admin.adminLevel === "SITE") return true;
  if (admin.id === targetUserId) return false;
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { domain: true, departmentId: true, adminLevel: true },
  });
  if (!target) return false;
  if (RANK[target.adminLevel] >= RANK[admin.adminLevel]) return false;
  if (admin.adminLevel === "DOMAIN") return target.domain === admin.adminScope;
  if (admin.adminLevel === "DEPARTMENT") {
    return target.departmentId === admin.adminScope;
  }
  return false;
}

/** Can this admin manage the named organisation (domain)? */
export function canManageDomain(admin: AdminUser, domain: string): boolean {
  if (admin.adminLevel === "SITE") return true;
  return admin.adminLevel === "DOMAIN" && admin.adminScope === domain;
}

/** Can this admin manage the department (by id) in that organisation? */
export function canManageDepartment(
  admin: AdminUser,
  department: { id: string; domain: string },
): boolean {
  if (canManageDomain(admin, department.domain)) return true;
  return admin.adminLevel === "DEPARTMENT" && admin.adminScope === department.id;
}

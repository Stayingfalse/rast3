import type { Prisma } from "@prisma/client";
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
 * Day 9: organisers are the ADMIN members of a group (Membership table).
 * Site admins stay a flag on the user. `adminLevel` / `adminScope` on User are
 * still written (and shown in the UI) but no longer decide access.
 */
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
  adminLevel: AdminLevel;
  scope?: string;
  groupIds?: string[];
}> {
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { adminLevel: true, adminScope: true },
  });
  if (!currentUser) return { canModerate: false, adminLevel: "USER" };

  if (currentUser.adminLevel === "SITE") {
    return { canModerate: true, adminLevel: "SITE", scope: "site" };
  }

  const groupIds = await adminGroupIds(userId);
  if (groupIds.length === 0) return { canModerate: false, adminLevel: "USER" };
  const adminLevel =
    currentUser.adminLevel === "USER" ? "DEPARTMENT" : currentUser.adminLevel;
  const scope = currentUser.adminScope ?? undefined;

  if (!targetUserId) return { canModerate: true, adminLevel, scope, groupIds };
  return {
    canModerate: await isInGroups(targetUserId, groupIds),
    adminLevel,
    scope,
    groupIds,
  };
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
 * Can this admin act on that user? SITE admins can act on anyone; other
 * organisers only on members of a group they administer who rank below them,
 * so they can't remove or demote fellow or more senior organisers.
 */
export async function canManageUser(
  admin: AdminUser,
  targetUserId: string,
): Promise<boolean> {
  if (admin.adminLevel === "SITE") return true;
  if (admin.id === targetUserId) return false;
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { adminLevel: true },
  });
  if (!target) return false;
  if (RANK[target.adminLevel] >= RANK[admin.adminLevel]) return false;
  return isInGroups(targetUserId, await adminGroupIds(admin.id));
}

/** Can this admin manage the named organisation (by email domain)? */
export async function canManageDomain(
  admin: AdminUser,
  domain: string,
): Promise<boolean> {
  if (admin.adminLevel === "SITE") return true;
  const hit = await db.membership.findFirst({
    where: {
      userId: admin.id,
      role: "ADMIN",
      group: { kind: "ORG", emailDomain: domain.trim().toLowerCase() },
    },
    select: { id: true },
  });
  return !!hit;
}

/** Can this admin manage the department (legacy id) in that organisation? */
export async function canManageDepartment(
  admin: AdminUser,
  department: { id: string; domain: string },
): Promise<boolean> {
  if (await canManageDomain(admin, department.domain)) return true;
  const hit = await db.membership.findFirst({
    where: {
      userId: admin.id,
      role: "ADMIN",
      group: { kind: "TEAM", departmentId: department.id },
    },
    select: { id: true },
  });
  return !!hit;
}

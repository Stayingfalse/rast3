import { createHash } from "node:crypto";
import type { GroupStatus, MembershipRole, PrismaClient } from "@prisma/client";

/**
 * Day 8 bridge between the legacy Domain/Department/User fields and the new
 * Group/Membership tables. Until Day 9 moves queries over, the legacy fields
 * stay the source of truth and these helpers mirror every change into groups.
 * Ids match the backfill in the groups_and_seasons migration.
 */
type Db = Pick<PrismaClient, "group" | "membership" | "domain" | "department" | "user">;

const norm = (domain: string | null | undefined) =>
  domain?.trim().toLowerCase() ?? "";
const orgId = (domain: string) =>
  `g_${createHash("md5").update(domain).digest("hex")}`;

async function domainStatus(db: Db, domain: string): Promise<GroupStatus> {
  const row = await db.domain.findUnique({ where: { name: domain } });
  if (!row) return "PENDING";
  return row.enabled ? "ACTIVE" : "DISABLED";
}

/** The ORG group for an email domain, created if missing. */
export async function ensureOrgGroup(db: Db, rawDomain: string) {
  const domain = norm(rawDomain);
  if (!domain) return null;
  const existing = await db.group.findUnique({ where: { emailDomain: domain } });
  if (existing) return existing;
  return db.group.upsert({
    where: { emailDomain: domain },
    update: {},
    create: {
      id: orgId(domain),
      kind: "ORG",
      name: domain,
      slug: domain,
      emailDomain: domain,
      status: await domainStatus(db, domain),
    },
  });
}

/** The TEAM group for a legacy department, created if missing. */
export async function ensureTeamGroup(db: Db, departmentId: string) {
  const existing = await db.group.findUnique({ where: { departmentId } });
  if (existing) return existing;
  const department = await db.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) return null;
  const org = await ensureOrgGroup(db, department.domain);
  if (!org) return null;
  return db.group.upsert({
    where: { departmentId },
    update: {},
    create: {
      id: `g_${department.id}`,
      kind: "TEAM",
      name: department.name,
      slug: `${org.slug}/${department.id}`,
      status: "ACTIVE",
      parentId: org.id,
      departmentId,
    },
  });
}

/** Mirrors a Domain row's enabled flag (or its deletion) onto its ORG group. */
export async function syncOrgGroupStatus(db: Db, rawDomain: string) {
  const domain = norm(rawDomain);
  if (!domain) return;
  const status = await domainStatus(db, domain);
  const org = await ensureOrgGroup(db, domain);
  if (org && org.status !== status) {
    // A deleted Domain row leaves the group closed rather than pending again
    await db.group.update({
      where: { id: org.id },
      data: { status: status === "PENDING" ? "DISABLED" : status },
    });
  }
}

/**
 * Recomputes one person's ORG and TEAM memberships from their legacy domain,
 * department and admin scope. COMMUNITY and FRIENDS memberships are untouched.
 */
export async function syncUserGroups(db: Db, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      domain: true,
      departmentId: true,
      adminLevel: true,
      adminScope: true,
    },
  });
  if (!user) return;

  const want = new Map<string, MembershipRole>();
  const add = (groupId: string | undefined, role: MembershipRole) => {
    if (!groupId) return;
    if (want.get(groupId) !== "ADMIN") want.set(groupId, role);
  };

  const domain = norm(user.domain);
  const scope = user.adminScope?.trim() ?? "";
  if (domain) {
    const org = await ensureOrgGroup(db, domain);
    add(org?.id, user.adminLevel === "DOMAIN" && norm(scope) === domain ? "ADMIN" : "MEMBER");
  }
  if (user.adminLevel === "DOMAIN" && scope) {
    add((await ensureOrgGroup(db, scope))?.id, "ADMIN");
  }
  if (user.departmentId) {
    const team = await ensureTeamGroup(db, user.departmentId);
    add(
      team?.id,
      user.adminLevel === "DEPARTMENT" && scope === user.departmentId ? "ADMIN" : "MEMBER",
    );
  }
  if (user.adminLevel === "DEPARTMENT" && scope) {
    add((await ensureTeamGroup(db, scope))?.id, "ADMIN");
  }

  await db.membership.deleteMany({
    where: {
      userId,
      group: { kind: { in: ["ORG", "TEAM"] } },
      groupId: { notIn: [...want.keys()] },
    },
  });
  for (const [groupId, role] of want) {
    await db.membership.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: { role },
      create: { groupId, userId, role },
    });
  }
}

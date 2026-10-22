import { createHash } from "node:crypto";
import type { GroupStatus, MembershipRole, PrismaClient } from "@prisma/client";

/**
 * Workplaces (ORG groups) and their teams (TEAM groups). Since the legacy
 * Domain/Department tables and User.domain/departmentId columns were retired
 * (20 Oct), memberships are the only record of who works where. Someone is in
 * at most one workplace, and at most one team inside it.
 */
type Db = Pick<PrismaClient, "group" | "membership">;

const norm = (domain: string | null | undefined) =>
  domain?.trim().toLowerCase() ?? "";
/** Same ids as the Day 8 backfill, so an organisation keeps one id forever. */
const orgId = (domain: string) =>
  `g_${createHash("md5").update(domain).digest("hex")}`;

/** The existing ORG group for an email domain (never creates one). */
export async function findOrgGroup(db: Db, rawDomain: string) {
  const domain = norm(rawDomain);
  if (!domain) return null;
  return db.group.findUnique({ where: { emailDomain: domain } });
}

/** Starts the ORG group for an email domain (organisations are only started explicitly). */
export async function createOrgGroup(
  db: Db,
  rawDomain: string,
  { status, createdById }: { status: GroupStatus; createdById?: string },
) {
  const domain = norm(rawDomain);
  return db.group.upsert({
    where: { emailDomain: domain },
    update: {},
    create: {
      id: orgId(domain),
      kind: "ORG",
      name: domain,
      slug: domain,
      emailDomain: domain,
      status,
      createdById,
    },
  });
}

/** Adds a team to a workplace. */
export async function createTeam(db: Db, org: { id: string; slug: string }, name: string) {
  const id = `g_${createHash("md5").update(`${org.id}/${name}/${Date.now()}`).digest("hex").slice(0, 24)}`;
  return db.group.create({
    data: {
      id,
      kind: "TEAM",
      name,
      slug: `${org.slug}/${id}`,
      status: "ACTIVE",
      parentId: org.id,
    },
  });
}

/** Someone's workplace membership and their team in it, if any. */
export async function getWorkplace(db: Db, userId: string) {
  const rows = await db.membership.findMany({
    where: { userId, group: { kind: { in: ["ORG", "TEAM"] } } },
    select: {
      role: true,
      joinedAt: true,
      group: {
        select: {
          id: true,
          kind: true,
          name: true,
          slug: true,
          status: true,
          parentId: true,
          emailDomain: true,
          joinCode: true,
        },
      },
    },
  });
  // Legacy data can leave an organiser running a second workplace they don't
  // belong to; their own (MEMBER) one wins, as in scope.ts
  const org =
    rows.find((r) => r.group.kind === "ORG" && r.role === "MEMBER") ??
    rows.find((r) => r.group.kind === "ORG") ??
    null;
  const team =
    rows.find((r) => r.group.kind === "TEAM" && r.group.parentId === org?.group.id) ?? null;
  return { org, team };
}

/**
 * Puts someone in a workplace. Joining a different workplace takes them out
 * of the old one and its teams; re-joining the same one keeps their team.
 */
export async function setWorkplace(
  db: Db,
  userId: string,
  orgGroupId: string,
  role: MembershipRole = "MEMBER",
) {
  await db.membership.deleteMany({
    where: {
      userId,
      OR: [
        { group: { kind: "ORG", id: { not: orgGroupId } } },
        { group: { kind: "TEAM", parentId: { not: orgGroupId } } },
      ],
    },
  });
  await db.membership.upsert({
    where: { groupId_userId: { groupId: orgGroupId, userId } },
    update: role === "ADMIN" ? { role } : {},
    create: { groupId: orgGroupId, userId, role },
  });
}

/** Sets (or clears, with null) someone's team inside their workplace. */
export async function setTeam(db: Db, userId: string, orgGroupId: string, teamId: string | null) {
  await db.membership.deleteMany({
    where: {
      userId,
      group: { kind: "TEAM", parentId: orgGroupId },
      ...(teamId ? { groupId: { not: teamId } } : {}),
    },
  });
  if (teamId) {
    await db.membership.upsert({
      where: { groupId_userId: { groupId: teamId, userId } },
      update: {},
      create: { groupId: teamId, userId },
    });
  }
}

/** Takes someone out of their workplace and all of its teams. */
export async function leaveWorkplace(db: Db, userId: string) {
  await db.membership.deleteMany({
    where: { userId, group: { kind: { in: ["ORG", "TEAM"] } } },
  });
}

/** Day 20: the organiser's suggested budget for a group (teams follow their workplace). */
export async function budgetFor(db: Pick<PrismaClient, "group">, groupId: string) {
  const g = await db.group.findUnique({
    where: { id: groupId },
    select: { kind: true, budget: true, parent: { select: { budget: true } } },
  });
  return (g?.kind === "TEAM" ? g.parent?.budget : g?.budget) ?? null;
}

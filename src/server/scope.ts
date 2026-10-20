import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Day 9: who someone can give to, see and manage is decided by their group
 * memberships (Day 8 tables), not the legacy User.domain / departmentId
 * columns. Everything that scopes people goes through here.
 */
type Db = Pick<PrismaClient, "membership">;

export type GiverScope = {
  /** ACTIVE organisation the person belongs to */
  orgId: string;
  /** their team within it, if any */
  teamId: string | null;
};

/** The person's organisation and team memberships (any status). */
export async function getMemberships(db: Db, userId: string) {
  const rows = await db.membership.findMany({
    where: { userId, group: { kind: { in: ["ORG", "TEAM"] } } },
    select: {
      role: true,
      group: { select: { id: true, kind: true, status: true, parentId: true } },
    },
  });
  const org = rows.find((r) => r.group.kind === "ORG" && r.role === "MEMBER")
    ?? rows.find((r) => r.group.kind === "ORG");
  const team = rows.find(
    (r) => r.group.kind === "TEAM" && r.group.parentId === org?.group.id,
  );
  return { org: org?.group ?? null, team: team?.group ?? null, rows };
}

/**
 * Scope for handing out wishlists. Only members of an ACTIVE organisation
 * (approved by a site admin) can pick up lists.
 */
export async function requireGiverScope(
  db: Db,
  userId: string,
  { needTeam }: { needTeam: boolean },
): Promise<GiverScope> {
  const { org, team } = await getMemberships(db, userId);
  if (org?.status !== "ACTIVE") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Your organisation isn't open for gifting yet",
    });
  }
  if (needTeam && !team) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Please choose your team on Your groups first",
    });
  }
  return { orgId: org.id, teamId: team?.id ?? null };
}

/** Prisma filters on User, by group membership. */
export const inGroup = (groupId: string): Prisma.UserWhereInput => ({
  memberships: { some: { groupId } },
});

/** Same organisation, outside the given team (or everyone if no team). */
export const inOrgOutsideTeam = (
  orgId: string,
  teamId: string | null,
): Prisma.UserWhereInput => ({
  AND: [inGroup(orgId), ...(teamId ? [{ NOT: inGroup(teamId) }] : [])],
});

/** Members of any other ACTIVE organisation ("strangers"). */
export const inOtherActiveOrg = (orgId: string): Prisma.UserWhereInput => ({
  AND: [
    {
      memberships: {
        some: { group: { kind: "ORG", status: "ACTIVE", id: { not: orgId } } },
      },
    },
    { NOT: inGroup(orgId) },
  ],
});

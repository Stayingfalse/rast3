import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

/**
 * Team leads (owner, 7 Nov). A team is part of a workplace; its lead (an
 * ADMIN membership of the team) looks after just that team: its page,
 * invites that pick the team, renaming it, moving people out of it (not out
 * of the workplace) and adding a co-lead. Workplace organisers and site
 * admins can do all of that for every team, and appoint or remove leads.
 * Leads already moderate their team's thank-yous (~/server/utils/admin-permissions).
 */
export type TeamAccess = {
  team: {
    id: string;
    name: string;
    parent: { id: string; name: string; status: string; emailDomain: string | null; joinCode: string | null };
  };
  siteAdmin: boolean;
  /** organises the team's workplace */
  organiser: boolean;
  /** leads this team */
  lead: boolean;
};

/** The team, if this person leads it, organises its workplace or is a site admin; else throws. */
export async function requireTeamAccess(
  db: Pick<PrismaClient, "group" | "membership" | "user">,
  teamId: string,
  userId: string,
): Promise<TeamAccess> {
  const team = await db.group.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      kind: true,
      parent: { select: { id: true, name: true, status: true, emailDomain: true, joinCode: true } },
    },
  });
  if (team?.kind !== "TEAM" || !team.parent) throw new TRPCError({ code: "NOT_FOUND" });
  const [me, mine, theirOrg] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { adminLevel: true } }),
    db.membership.findUnique({ where: { groupId_userId: { groupId: team.id, userId } }, select: { role: true } }),
    db.membership.findUnique({
      where: { groupId_userId: { groupId: team.parent.id, userId } },
      select: { role: true },
    }),
  ]);
  const access = {
    team: { id: team.id, name: team.name, parent: team.parent },
    siteAdmin: me?.adminLevel === "SITE",
    organiser: theirOrg?.role === "ADMIN",
    lead: mine?.role === "ADMIN",
  };
  if (!access.siteAdmin && !access.organiser && !access.lead) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Team leads and workplace organisers only" });
  }
  return access;
}

/** Workplace organisers and site admins run every team; a lead only theirs. */
export const runsWorkplace = (a: TeamAccess) => a.siteAdmin || a.organiser;

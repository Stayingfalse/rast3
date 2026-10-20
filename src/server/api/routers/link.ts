import { createTRPCRouter, siteAdminProcedure } from "../trpc";

export const linkRouter = createTRPCRouter({
  /** Site admins: everyone with a wishlist, with their workplace and team. */
  getAll: siteAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.user.findMany({
      where: { amazonWishlistUrl: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        workEmail: true,
        firstName: true,
        lastName: true,
        amazonWishlistUrl: true,
        memberships: {
          where: { group: { kind: { in: ["ORG", "TEAM"] } } },
          select: { group: { select: { kind: true, name: true } } },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const users = rows
      .map(({ memberships, ...u }) => ({
        ...u,
        workplace: memberships.find((m) => m.group.kind === "ORG")?.group.name ?? null,
        team: memberships.find((m) => m.group.kind === "TEAM")?.group.name ?? null,
      }))
      .sort(
        (a, b) =>
          (a.workplace ?? "~").localeCompare(b.workplace ?? "~") ||
          (a.team ?? "~").localeCompare(b.team ?? "~"),
      );

    const userIds = users.map((u) => u.id);
    // Get assignment counts
    const assignments = await ctx.db.wishlistAssignment.groupBy({
      by: ["wishlistOwnerId"],
      where: { wishlistOwnerId: { in: userIds }, isActive: true },
      _count: { id: true },
    });
    // Get purchase counts
    const purchases = await ctx.db.purchase.groupBy({
      by: ["wishlistAssignmentId"],
      _count: { id: true },
    });
    // Map assignmentId to wishlistOwnerId
    const assignmentIdToOwner: Record<string, string> = {};
    const allAssignments = await ctx.db.wishlistAssignment.findMany({
      where: { wishlistOwnerId: { in: userIds } },
      select: { id: true, wishlistOwnerId: true },
    });
    for (const a of allAssignments) {
      assignmentIdToOwner[a.id] = a.wishlistOwnerId;
    }
    // Count purchases per owner
    const purchasedCount: Record<string, number> = {};
    for (const p of purchases) {
      const ownerId = assignmentIdToOwner[p.wishlistAssignmentId];
      if (ownerId) {
        purchasedCount[ownerId] = (purchasedCount[ownerId] ?? 0) + p._count.id;
      }
    }
    // Fetch all wishlist assignments for these users (as owners)
    const wishlistAssignments = await ctx.db.wishlistAssignment.findMany({
      where: { wishlistOwnerId: { in: userIds } },
      select: { id: true, wishlistOwnerId: true },
    });

    // Map ownerId to their assignment IDs
    const ownerToAssignmentIds: Record<string, string[]> = {};
    for (const wa of wishlistAssignments) {
      (ownerToAssignmentIds[wa.wishlistOwnerId] ??= []).push(wa.id);
    }

    // Fetch all unresolved reports for these assignments
    const allAssignmentIds = wishlistAssignments.map((wa) => wa.id);
    const reports = await ctx.db.wishlistReport.findMany({
      where: {
        wishlistAssignmentId: { in: allAssignmentIds },
        resolved: false,
      },
      select: {
        wishlistAssignmentId: true,
        reportType: true,
        description: true,
      },
    });

    // Map assignmentId to its reports
    const assignmentIdToReports: Record<string, { reportType: string; description: string | null }[]> = {};
    for (const r of reports) {
      (assignmentIdToReports[r.wishlistAssignmentId] ??= []).push({ reportType: r.reportType, description: r.description });
    }

    // For each user, aggregate all error messages from their assignments
    return users.map((user) => {
      const assignment = assignments.find(
        (a: { wishlistOwnerId: string; _count: { id: number } }) =>
          a.wishlistOwnerId === user.id,
      );
      const allocated = assignment?._count.id ?? 0;
      const purchased = purchasedCount[user.id] ?? 0;
      // Gather all unresolved reports for this user's assignments
      const assignmentIds = ownerToAssignmentIds[user.id] ?? [];
      const errors: string[] = [];
      for (const aid of assignmentIds) {
        const reports = assignmentIdToReports[aid] ?? [];
        for (const rep of reports) {
          let msg = rep.reportType;
          if (rep.description) msg += ': ' + rep.description;
          errors.push(msg);
        }
      }
      return {
        ...user,
        amazonWishlistUrlStats: {
          allocated,
          purchased,
          errors,
        },
      };
    });
  }),
});

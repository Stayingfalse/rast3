import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Router: wishlistReports
 * - getForCurrentUser: returns grouped, unresolved reports affecting the current user's wishlist
 * - resolveByIds: marks provided report ids as resolved
 *
 * NOTE: this assumes a Prisma model named `WishlistReport` with at minimum fields:
 *   - id: string
 *   - reportType: ReportType (enum)
 *   - resolved: boolean
 *   - wishlistAssignmentId?: string
 *   - reportedAt: Date
 *   - description?: string
 */
export const wishlistReportsRouter = createTRPCRouter({
  getForCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Find reports that affect wishlists owned by this user and are unresolved.
    // We conservatively query `wishlistReport` and join wishlist owner via prisma relations.
    const reports = await ctx.db.wishlistReport.findMany({
      where: {
        resolved: false,
        userId: userId,
      },
      select: {
        id: true,
        reportType: true,
        resolved: true,
        wishlistAssignmentId: true,
        description: true,
        reportedAt: true,
      },
      orderBy: { reportedAt: "desc" },
    });

    // Group by type
    type ReportItem = typeof reports[number];
    const groups: Record<string, ReportItem[]> = {};
    for (const r of reports) {
      groups[r.reportType] = groups[r.reportType] ?? [];
      groups[r.reportType]?.push(r);
    }

    return Object.entries(groups).map(([type, items]) => ({
      type,
      count: items.length,
      ids: items.map((i) => i.id),
      items,
    }));
  }),

  resolveByIds: protectedProcedure
    .input(z.object({ reportIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.wishlistReport.updateMany({
        where: { id: { in: input.reportIds } },
        data: { resolved: true },
      });

      // returning count is useful for the client
      return { count: result.count };
    }),
});

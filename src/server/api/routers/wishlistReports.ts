import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Router: wishlistReports
 * - getForCurrentUser: returns grouped, unresolved reports affecting the current user's wishlist
 * - resolveByIds: marks provided report ids as resolved
 *
 * NOTE: this assumes a Prisma model named `Report` with at minimum fields:
 *   - id: string
 *   - type: string
 *   - resolved: boolean
 *   - wishlistId?: string
 *   - createdAt: Date
 *   - message?: string
 */
export const wishlistReportsRouter = createTRPCRouter({
  getForCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Find reports that affect wishlists owned by this user and are unresolved.
    // We conservatively query `report` and join wishlist owner via prisma relations.
    const reports = await ctx.prisma.report.findMany({
      where: {
        resolved: false,
        wishlist: {
          ownerId: userId,
        },
      },
      select: {
        id: true,
        type: true,
        resolved: true,
        wishlistId: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by type
    const groups: Record<string, any[]> = {};
    for (const r of reports) {
      groups[r.type] = groups[r.type] ?? [];
      groups[r.type].push(r);
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
      const result = await ctx.prisma.report.updateMany({
        where: { id: { in: input.reportIds } },
        data: { resolved: true },
      });

      // returning count is useful for the client
      return { count: result.count };
    }),
});

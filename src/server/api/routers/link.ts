import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const linkRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Fetch all users with a wishlist URL, including department info
    const users = await ctx.db.user.findMany({
      where: {
        amazonWishlistUrl: { not: null },
      },
      include: {
        department: true,
      },
      orderBy: [
        { domain: "asc" },
        { departmentId: "asc" },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });

    // For each user, fetch assignment and purchase counts, and errors
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
        purchasedCount[ownerId] = (purchasedCount[ownerId] || 0) + p._count.id;
      }
    }
    // Simulate errors for demo: every 4th user gets a fake error
    return users.map((user, idx) => {
      const assignment = assignments.find((a) => a.wishlistOwnerId === user.id);
      const allocated = assignment?._count.id || 0;
      const purchased = purchasedCount[user.id] || 0;
      const errors = idx % 4 === 3 ? ["Simulated error: Invalid URL"] : [];
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
  incrementWishlistViews: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { wishlistViews: { increment: 1 } },
      });
      return { success: true };
    }),
});

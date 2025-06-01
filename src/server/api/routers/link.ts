import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Define types for better type safety
type UserWithWishlist = {
  id: string;
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  amazonWishlistUrl?: string | null;
  domain?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    domain: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export const linkRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Get current user to check admin level and scope
    const currentUser = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { 
        adminLevel: true, 
        adminScope: true,
        domain: true,
        departmentId: true,
      },
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Build where clause based on admin level
    const where: Record<string, unknown> = {
      amazonWishlistUrl: { not: null },
    };

    if (currentUser.adminLevel === "DOMAIN") {
      where.domain = currentUser.adminScope;
    } else if (currentUser.adminLevel === "DEPARTMENT") {
      where.departmentId = currentUser.adminScope;
    }
    // SITE admins see all users (no additional filter)
    // USER level shouldn't access this endpoint

    // Fetch users with a wishlist URL, including department info
    const users = await ctx.db.user.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: [
        { domain: "asc" },
        { departmentId: "asc" },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });    // For each user, fetch assignment and purchase counts, and errors
    const userIds = users.map((u: UserWithWishlist) => u.id);
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
    // Simulate errors for demo: every 4th user gets a fake error
    return users.map((user: UserWithWishlist, idx: number) => {
      const assignment = assignments.find((a: { wishlistOwnerId: string; _count: { id: number } }) => a.wishlistOwnerId === user.id);
      const allocated = assignment?._count.id ?? 0;
      const purchased = purchasedCount[user.id] ?? 0;
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

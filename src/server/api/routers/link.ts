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
    // Return users as "wishlists" for the dashboard
    return users;
  }),
});

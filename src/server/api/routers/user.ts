import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Get all users with their profile and domain information
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Get current user
    const currentUser = await (ctx.db as any).user.findUnique({
      where: { id: ctx.session.user.id },
    });
    if (!currentUser) return [];

    let where = {};
    if (currentUser.adminLevel === "DOMAIN") {
      where = { domain: currentUser.adminScope };
    } else if (currentUser.adminLevel === "DEPARTMENT") {
      where = { departmentId: currentUser.adminScope };
    }
    // SITE gets all, USER should never reach here

    return (ctx.db as any).user.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: [
        { profileCompleted: "asc" },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });
  }),

  // Get user statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const totalUsers = await (ctx.db as any).user.count();
    const completedProfiles = await (ctx.db as any).user.count({
      where: { profileCompleted: true },
    });
    const pendingProfiles = totalUsers - completedProfiles;

    // Get users by domain
    const usersByDomain = await (ctx.db as any).user.groupBy({
      by: ['domain'],
      _count: {
        id: true,
      },
      where: {
        domain: { not: null },
      },
    });

    return {
      totalUsers,
      completedProfiles,
      pendingProfiles,
      usersByDomain: usersByDomain.map((item: any) => ({
        domain: item.domain,
        count: item._count.id,
      })),
    };
  }),

  // Update user's profile completion status (admin only)
  toggleProfileCompletion: protectedProcedure
    .input(z.object({
      userId: z.string(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return (ctx.db as any).user.update({
        where: { id: input.userId },
        data: {
          profileCompleted: input.completed,
          profileCompletedAt: input.completed ? new Date() : null,
        },
      });
    }),

  // Delete user (admin only)
  delete: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Don't allow deleting the current user
      if (input.userId === ctx.session.user.id) {
        throw new Error("You cannot delete your own account");
      }

      return (ctx.db as any).user.delete({
        where: { id: input.userId },
      });
    }),

  // Update user's department
  updateDepartment: protectedProcedure
    .input(z.object({
      userId: z.string(),
      departmentId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return (ctx.db as any).user.update({
        where: { id: input.userId },
        data: {
          departmentId: input.departmentId,
        },
        include: {
          department: true,
        },
      });
    }),
});

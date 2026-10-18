import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import {
  canManageDepartment,
  canManageDomain,
  canManageUser,
  checkAdminPermissions,
} from "~/server/utils/admin-permissions";

const forbidden = (message = "That member isn't in your scope") =>
  new TRPCError({ code: "FORBIDDEN", message });

/** Prisma filter for the members an organiser can see. */
const scopeWhere = (admin: {
  adminLevel: string;
  adminScope: string | null;
}): Record<string, unknown> => {
  if (admin.adminLevel === "DOMAIN") return { domain: admin.adminScope };
  if (admin.adminLevel === "DEPARTMENT") {
    return { departmentId: admin.adminScope };
  }
  return {};
};

// Define AdminLevelEnum to represent the possible admin level values
type AdminLevelEnum = "USER" | "DEPARTMENT" | "DOMAIN" | "SITE";

type Department = {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
};

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  amazonWishlistUrl?: string | null;
  wishlistViews: number;
  departmentId?: string | null;
  domain?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileCompleted: boolean;
  profileCompletedAt?: Date | null;
  workEmail?: string | null;
  adminLevel: AdminLevelEnum; // Changed from string to AdminLevelEnum
  adminScope?: string | null;
};

type UserWithDepartment = User & {
  department: Department | null;
};

type UserGroupByDomain = {
  domain: string | null;
  _count: {
    id: number;
  };
};

// Specific types for the different query results
type AssignmentWithOwner = {
  id: string;
  assignedUserId: string;
  wishlistOwnerId: string;
  purchases: {
    id: string;
    userId: string;
    wishlistAssignmentId: string;
    purchasedAt: Date;
    notes: string | null;
  } | null;
  reports: Array<{
    id: string;
    userId: string;
    wishlistAssignmentId: string;
    reportType: string;
    description: string | null;
    reportedAt: Date;
    resolved: boolean;
    resolvedAt: Date | null;
  }>;
  wishlistOwner: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

type AssignmentWithUser = {
  id: string;
  assignedUserId: string;
  wishlistOwnerId: string;
  purchases: {
    id: string;
    userId: string;
    wishlistAssignmentId: string;
    purchasedAt: Date;
    notes: string | null;
  } | null;
  reports: Array<{
    id: string;
    userId: string;
    wishlistAssignmentId: string;
    reportType: string;
    description: string | null;
    reportedAt: Date;
    resolved: boolean;
    resolvedAt: Date | null;
  }>;
  assignedUser: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

export const userRouter = createTRPCRouter({
  // Get all users with their profile and domain information
  getAll: adminProcedure.query(
    async ({ ctx }): Promise<UserWithDepartment[]> => {
      const where = scopeWhere(ctx.admin);

      return ctx.db.user.findMany({
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
    },
  ),

  // Get user statistics
  getStats: adminProcedure.query(async ({ ctx }) => {
    const scope = scopeWhere(ctx.admin);
    const totalUsers = await ctx.db.user.count({ where: scope });
    const completedProfiles = await ctx.db.user.count({
      where: { ...scope, profileCompleted: true },
    });
    const pendingProfiles = totalUsers - completedProfiles;

    // Get users by domain
    const usersByDomain = await ctx.db.user.groupBy({
      by: ["domain"],
      _count: {
        id: true,
      },
      where: {
        domain: { not: null },
        ...scope,
      },
    });
    return {
      totalUsers,
      completedProfiles,
      pendingProfiles,
      usersByDomain: usersByDomain.map((item: UserGroupByDomain) => ({
        domain: item.domain,
        count: item._count.id,
      })),
    };
  }),

  // Update user's profile completion status (admin only)
  toggleProfileCompletion: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        completed: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!(await canManageUser(ctx.admin, input.userId))) throw forbidden();
      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          profileCompleted: input.completed,
          profileCompletedAt: input.completed ? new Date() : null,
        },
      });
    }),

  // Delete user (admin only)
  delete: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Don't allow deleting the current user
      if (input.userId === ctx.session.user.id) {
        throw new Error("You cannot delete your own account");
      }
      if (!(await canManageUser(ctx.admin, input.userId))) throw forbidden();
      return ctx.db.user.delete({
        where: { id: input.userId },
      });
    }),

  // Update user's department
  updateDepartment: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        departmentId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!(await canManageUser(ctx.admin, input.userId))) throw forbidden();
      if (input.departmentId) {
        const [target, department] = await Promise.all([
          ctx.db.user.findUnique({
            where: { id: input.userId },
            select: { domain: true },
          }),
          ctx.db.department.findUnique({ where: { id: input.departmentId } }),
        ]);
        if (
          !department ||
          department.domain !== target?.domain ||
          !canManageDepartment(ctx.admin, department)
        ) {
          throw forbidden("That department isn't in your scope");
        }
      }
      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          departmentId: input.departmentId,
        },
        include: {
          department: true,
        },
      });
    }),
  // Update user's admin level and scope
  updateAdminLevel: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        adminLevel: z.enum(["USER", "DEPARTMENT", "DOMAIN"]), // Don't expose SITE level
        adminScope: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.admin;
      if (input.userId === currentUser.id) {
        throw forbidden("You can't change your own admin level");
      }
      if (!(await canManageUser(currentUser, input.userId))) throw forbidden();

      // DEPARTMENT admins can only promote to DEPARTMENT level, not DOMAIN
      if (
        currentUser.adminLevel === "DEPARTMENT" &&
        input.adminLevel === "DOMAIN"
      ) {
        throw new Error(
          "Department administrators can only promote users to department admin level",
        );
      }

      // Validate that adminScope is provided for DOMAIN and DEPARTMENT levels
      if (
        (input.adminLevel === "DOMAIN" || input.adminLevel === "DEPARTMENT") &&
        !input.adminScope
      ) {
        throw new Error(
          "Admin scope is required for domain and department admin levels",
        );
      }

      // Organisers are scoped to the member's own organisation or department
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { domain: true, departmentId: true },
      });
      if (input.adminLevel === "DOMAIN") {
        if (
          !input.adminScope ||
          input.adminScope !== target?.domain ||
          !canManageDomain(currentUser, input.adminScope)
        ) {
          throw forbidden("That organisation isn't in your scope");
        }
      } else if (input.adminLevel === "DEPARTMENT") {
        const department = await ctx.db.department.findUnique({
          where: { id: input.adminScope ?? "" },
        });
        if (
          !department ||
          input.adminScope !== target?.departmentId ||
          !canManageDepartment(currentUser, department)
        ) {
          throw forbidden("That department isn't in your scope");
        }
      }

      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminLevel: input.adminLevel,
          adminScope: input.adminLevel === "USER" ? null : input.adminScope,
        },
        include: {
          department: true,
        },
      });
    }),

  // Get detailed user statistics for tooltips
  getUserStats: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { canModerate } = await checkAdminPermissions(
        ctx.admin.id,
        input.userId,
      );
      if (!canModerate) throw forbidden();
      // Get user's assignment statistics
      const assignmentStats = (await ctx.db.wishlistAssignment.findMany({
        where: { assignedUserId: input.userId },
        include: {
          purchases: true,
          reports: true,
          wishlistOwner: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })) as AssignmentWithOwner[];

      // Get user's own wishlist statistics
      const ownWishlistStats = (await ctx.db.wishlistAssignment.findMany({
        where: { wishlistOwnerId: input.userId },
        include: {
          purchases: true,
          reports: true,
          assignedUser: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })) as AssignmentWithUser[]; // Calculate totals
      const totalAssignments = assignmentStats.length;
      const totalPurchases = assignmentStats.filter((a) => a.purchases).length;
      const totalReports = assignmentStats.reduce(
        (sum: number, a) => sum + a.reports.length,
        0,
      );

      const wishlistAssignedTo = ownWishlistStats.length;
      const wishlistPurchases = ownWishlistStats.filter(
        (a) => a.purchases,
      ).length;
      const wishlistReports = ownWishlistStats.reduce(
        (sum: number, a) => sum + a.reports.length,
        0,
      );

      return {
        assignments: {
          total: totalAssignments,
          purchased: totalPurchases,
          reported: totalReports,
        },
        ownWishlist: {
          assignedTo: wishlistAssignedTo,
          purchases: wishlistPurchases,
          reports: wishlistReports,
        },
        recentActivity: {
          assignments: assignmentStats.slice(0, 3).map((a) => ({
            ownerName:
              a.wishlistOwner.firstName && a.wishlistOwner.lastName
                ? `${a.wishlistOwner.firstName} ${a.wishlistOwner.lastName}`
                : (a.wishlistOwner.name ?? "Unknown"),
            hasPurchase: !!a.purchases,
            hasReports: a.reports.length > 0,
          })),
        },
      };
    }),
});

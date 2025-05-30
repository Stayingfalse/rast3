import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const wishlistRouter = createTRPCRouter({  // Get the current user's assigned wishlists (links they can shop from)
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    const assignments = await ctx.db.wishlistAssignment.findMany({
      where: {
        assignedUserId: ctx.session.user.id,
        isActive: true,
      },
      include: {
        wishlistOwner: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            amazonWishlistUrl: true,
            domain: true, // <-- Add domain to the select
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        purchases: true,
        reports: {
          where: {
            userId: ctx.session.user.id,
          },
        },
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });

    return assignments;
  }),

  // Get statistics about assignments (for admins or debugging)
  getAssignmentStats: protectedProcedure.query(async ({ ctx }) => {
    // Get current user for department context
    const currentUser = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { id: true, departmentId: true },
    });
    const departmentId = currentUser?.departmentId;
    const userId = currentUser?.id;

    // Total wishlists with a URL (site-wide)
    const totalLinks = await ctx.db.user.count({
      where: { amazonWishlistUrl: { not: null } },
    });

    // Wishlists with a URL in the current user's department
    const departmentLinks = departmentId
      ? await ctx.db.user.count({
          where: {
            amazonWishlistUrl: { not: null },
            departmentId,
          },
        })
      : 0;

    // Unallocated wishlists (with URL, not assigned to anyone), EXCLUDING current user's own
    const unallocatedLinks = await ctx.db.user.count({
      where: {
        amazonWishlistUrl: { not: null },
        id: { not: userId },
        ownedWishlist: {
          none: { isActive: true },
        },
      },
    });

    // Unallocated wishlists in the current user's department, EXCLUDING current user's own
    const unallocatedDepartmentLinks = departmentId
      ? await ctx.db.user.count({
          where: {
            amazonWishlistUrl: { not: null },
            departmentId,
            id: { not: userId },
            ownedWishlist: {
              none: { isActive: true },
            },
          },
        })
      : 0;

    // Old stats for compatibility
    const totalUsers = await ctx.db.user.count({
      where: {
        profileCompleted: true,
        amazonWishlistUrl: { not: null },
      },
    });
    const totalAssignments = await ctx.db.wishlistAssignment.count({
      where: { isActive: true },
    });
    const usersWithAssignments = await ctx.db.user.count({
      where: {
        assignedLinks: {
          some: { isActive: true },
        },
      },
    });
    const averageAssignments = totalUsers > 0 ? totalAssignments / totalUsers : 0;

    return {
      totalLinks,
      departmentLinks,
      unallocatedLinks,
      unallocatedDepartmentLinks,
      totalUsers,
      totalAssignments,
      usersWithAssignments,
      averageAssignments,
    };
  }),

  // Distribute initial 3 wishlists to current user
  requestInitialAssignments: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Check if user has profile completed and wishlist URL
    const currentUser = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        profileCompleted: true,
        amazonWishlistUrl: true,
        domain: true,
        departmentId: true,
      },
    });

    if (!currentUser?.profileCompleted || !currentUser?.amazonWishlistUrl) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Please complete your profile and add your wishlist URL first",
      });
    }

    if (!currentUser.domain || !currentUser.departmentId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Please ensure your domain and department are set in your profile",
      });
    }

    // Check if user already has assignments
    const existingAssignments = await ctx.db.wishlistAssignment.findMany({
      where: {
        assignedUserId: userId,
        isActive: true,
      },
      select: { wishlistOwnerId: true },
    });
    const assignedUserIds = existingAssignments.map(a => a.wishlistOwnerId);

    if (assignedUserIds.length >= 3) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have your initial 3 assignments",
      });
    }

    // Get all eligible users (excluding current user, users without wishlists, different domain/department, and already assigned)
    const eligibleUsers = await ctx.db.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { id: { notIn: assignedUserIds } },
          { profileCompleted: true },
          { amazonWishlistUrl: { not: null } },
          { domain: currentUser.domain }, // Same domain only
          { departmentId: currentUser.departmentId }, // Same department only
        ],
      },
      select: {
        id: true,
        name: true,
        ownedWishlist: {
          where: { isActive: true },
          select: { assignedUserId: true },
        },
      },
    });

    // Sort by assignment count (prioritize users with fewer assignments)
    const sortedUsers = eligibleUsers
      .map(user => ({
        ...user,
        assignmentCount: user.ownedWishlist.length,
      }))
      .sort((a, b) => a.assignmentCount - b.assignmentCount);

    // Select up to 3 users, avoiding duplicates
    const neededAssignments = 3 - assignedUserIds.length;
    const selectedUsers = sortedUsers.slice(0, neededAssignments);

    if (selectedUsers.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No eligible wishlists available for assignment",
      });
    }

    // Create assignments
    const assignments = await Promise.all(
      selectedUsers.map(user =>
        ctx.db.wishlistAssignment.create({
          data: {
            assignedUserId: userId,
            wishlistOwnerId: user.id,
          },
          include: {
            wishlistOwner: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                amazonWishlistUrl: true,
              },
            },
          },
        })
      )
    );

    return assignments;
  }),

  // Request additional assignments beyond the initial 3
  requestAdditionalAssignments: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(5).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get current user's domain and department
      const currentUser = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          domain: true,
          departmentId: true,
        },
      });

      if (!currentUser?.domain || !currentUser?.departmentId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please ensure your domain and department are set in your profile",
        });
      }

      // Check current assignment count
      const currentAssignmentCount = await ctx.db.wishlistAssignment.count({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
      });

      if (currentAssignmentCount < 3) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please request your initial 3 assignments first",
        });
      }

      // Get users already assigned to this user
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
        select: { wishlistOwnerId: true },
      });

      const assignedUserIds = existingAssignments.map(a => a.wishlistOwnerId);      // Get eligible users (excluding already assigned ones, same domain/department only)
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: assignedUserIds } },
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            { domain: currentUser.domain }, // Same domain only
            { departmentId: currentUser.departmentId }, // Same department only
          ],
        },
        select: {
          id: true,
          name: true,
          ownedWishlist: {
            where: { isActive: true },
            select: { assignedUserId: true },
          },
        },
      });

      // Sort by assignment count (prioritize users with fewer assignments)
      const sortedUsers = eligibleUsers
        .map(user => ({
          ...user,
          assignmentCount: user.ownedWishlist.length,
        }))
        .sort((a, b) => a.assignmentCount - b.assignmentCount);

      const selectedUsers = sortedUsers.slice(0, input.count);

      if (selectedUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No additional wishlists available for assignment",
        });
      }

      // Create assignments
      const assignments = await Promise.all(
        selectedUsers.map(user =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  amazonWishlistUrl: true,
                },
              },
            },
          })
        )
      );

      return assignments;
    }),

  // Request cross-department assignments when same-department ones are not available
  requestCrossDepartmentAssignments: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(3).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get current user's domain (but allow different departments)
      const currentUser = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          domain: true,
          departmentId: true,
        },
      });

      if (!currentUser?.domain) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please ensure your domain is set in your profile",
        });
      }

      // Get users already assigned to this user
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
        select: { wishlistOwnerId: true },
      });

      const assignedUserIds = existingAssignments.map(a => a.wishlistOwnerId);

      // Get eligible users from same domain but different departments
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: assignedUserIds } },
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            { domain: currentUser.domain }, // Same domain
            { departmentId: { not: currentUser.departmentId } }, // Different department
          ],
        },
        select: {
          id: true,
          name: true,
          department: {
            select: {
              name: true,
            },
          },
          ownedWishlist: {
            where: { isActive: true },
            select: { assignedUserId: true },
          },
        },
      });

      // Sort by assignment count (prioritize users with fewer assignments)
      const sortedUsers = eligibleUsers
        .map(user => ({
          ...user,
          assignmentCount: user.ownedWishlist.length,
        }))
        .sort((a, b) => a.assignmentCount - b.assignmentCount);

      const selectedUsers = sortedUsers.slice(0, input.count);

      if (selectedUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cross-department wishlists available for assignment",
        });
      }      // Create assignments
      const assignments = await Promise.all(
        selectedUsers.map(user =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  amazonWishlistUrl: true,
                  department: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          })
        )
      );

      return assignments;
    }),

  // Request cross-domain (stranger) assignments when no more are available in user's domain
  requestCrossDomainAssignments: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(3).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get current user's domain
      const currentUser = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { domain: true },
      });

      if (!currentUser?.domain) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please ensure your domain is set in your profile",
        });
      }

      // Get users already assigned to this user
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
        select: { wishlistOwnerId: true },
      });
      const assignedUserIds = existingAssignments.map(a => a.wishlistOwnerId);

      // Get eligible users from a different domain
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: assignedUserIds } },
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            { domain: { not: currentUser.domain } }, // Different domain only
          ],
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          amazonWishlistUrl: true,
          ownedWishlist: {
            where: { isActive: true },
            select: { assignedUserId: true },
          },
        },
      });

      // Sort by assignment count (prioritize users with fewer assignments)
      const sortedUsers = eligibleUsers
        .map(user => ({
          ...user,
          assignmentCount: user.ownedWishlist.length,
        }))
        .sort((a, b) => a.assignmentCount - b.assignmentCount);

      const selectedUsers = sortedUsers.slice(0, input.count);

      if (selectedUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cross-domain wishlists available for assignment",
        });
      }

      // Create assignments (do not include department/domain info in return)
      const assignments = await Promise.all(
        selectedUsers.map(user =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  amazonWishlistUrl: true,
                  // No department/domain info for privacy
                },
              },
            },
          })
        )
      );

      return assignments;
    }),

  // Mark a purchase as completed
  markPurchase: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the assignment belongs to the current user
      const assignment = await ctx.db.wishlistAssignment.findFirst({
        where: {
          id: input.assignmentId,
          assignedUserId: userId,
          isActive: true,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or not accessible",
        });
      }

      // Check if purchase already exists
      const existingPurchase = await ctx.db.purchase.findUnique({
        where: {
          wishlistAssignmentId: input.assignmentId,
        },
      });

      if (existingPurchase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Purchase already marked for this assignment",
        });
      }

      // Create the purchase record
      const purchase = await ctx.db.purchase.create({
        data: {
          userId,
          wishlistAssignmentId: input.assignmentId,
          notes: input.notes,
        },
        include: {
          wishlistAssignment: {
            include: {
              wishlistOwner: {
                select: {
                  name: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return purchase;
    }),

  // Report an issue with a wishlist
  reportIssue: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      reportType: z.enum(["NO_ITEMS", "DOESNT_EXIST", "NO_ADDRESS", "OTHER"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the assignment belongs to the current user
      const assignment = await ctx.db.wishlistAssignment.findFirst({
        where: {
          id: input.assignmentId,
          assignedUserId: userId,
          isActive: true,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or not accessible",
        });
      }

      // Create the report
      const report = await ctx.db.wishlistReport.create({
        data: {
          userId,
          wishlistAssignmentId: input.assignmentId,
          reportType: input.reportType,
          description: input.description,
        },
        include: {
          wishlistAssignment: {
            include: {
              wishlistOwner: {
                select: {
                  name: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return report;
    }),

  // Clear report when issue is fixed
  clearReport: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the user owns this assignment
      const assignment = await ctx.db.wishlistAssignment.findFirst({
        where: {
          id: input.assignmentId,
          assignedUserId: userId,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only clear reports for your own assignments",
        });
      }

      // Delete all reports for this assignment
      await ctx.db.wishlistReport.deleteMany({
        where: {
          wishlistAssignmentId: input.assignmentId,
        },
      });

      return { success: true };
    }),

  // Undo purchase marking
  undoPurchase: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the user owns this assignment
      const assignment = await ctx.db.wishlistAssignment.findFirst({
        where: {
          id: input.assignmentId,
          assignedUserId: userId,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only undo purchases for your own assignments",
        });
      }      // Delete the purchase record
      await ctx.db.purchase.deleteMany({
        where: {
          wishlistAssignmentId: input.assignmentId,
        },
      });

      return { success: true };
    }),

  // Get reports for admin/debugging
  getAllReports: protectedProcedure.query(async ({ ctx }) => {
    // Note: In production, you'd want to add admin permission check here
    const reports = await ctx.db.wishlistReport.findMany({
      include: {
        user: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        wishlistAssignment: {
          include: {
            wishlistOwner: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                amazonWishlistUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        reportedAt: 'desc',
      },
    });

    return reports;
  }),
});

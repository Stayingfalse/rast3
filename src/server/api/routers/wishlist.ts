import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  rateLimit,
} from "~/server/api/trpc";
import {
  inGroup,
  inOrgOutsideTeam,
  inOtherActiveOrg,
  requireGiverScope,
} from "~/server/scope";
import { getWorkplace } from "~/server/groups";

const HOUR = 60 * 60_000;
// Picking up wishlists hands out other people's links, so cap how fast one
// person can draw them.
const requestLimit = rateLimit("wishlist.request", 30, HOUR);

export const wishlistRouter = createTRPCRouter({
  // Get the current user's assigned wishlists (links they can shop from)
  // Workplace pick-ups by default; pass a friends/community group id for that
  // group's (Day 14)
  getMyAssignments: protectedProcedure
    .input(z.object({ groupId: z.string().nullable() }).nullish())
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: ctx.session.user.id,
          isActive: true,
          groupId: input?.groupId ?? null,
        },
        include: {
          // Never send the owner's name to the person buying for them: gifts
          // are anonymous both ways (see /privacy).
          wishlistOwner: {
            select: {
              id: true,
              amazonWishlistUrl: true,
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
          assignedAt: "asc",
        },
      });

      // Where each list comes from, relative to you: your team, another team
      // in your workplace (named), elsewhere, or a friends/community group
      const { org, team } = await getWorkplace(ctx.db, ctx.session.user.id);
      const owners = await ctx.db.membership.findMany({
        where: {
          userId: { in: [...new Set(assignments.map((a) => a.wishlistOwnerId))] },
          group: { kind: { in: ["ORG", "TEAM"] } },
        },
        select: { userId: true, group: { select: { id: true, kind: true, name: true } } },
      });
      return assignments.map((a) => {
        const theirs = owners.filter((m) => m.userId === a.wishlistOwnerId).map((m) => m.group);
        const sameOrg = !!org && theirs.some((g) => g.id === org.group.id);
        const theirTeam = theirs.find((g) => g.kind === "TEAM");
        const from: "group" | "elsewhere" | "otherTeam" | "yourTeam" = a.groupId
          ? "group"
          : !sameOrg
            ? "elsewhere"
            : team && theirTeam && theirTeam.id !== team.group.id
              ? "otherTeam"
              : "yourTeam";
        return { ...a, from, fromTeam: from === "otherTeam" ? theirTeam!.name : null };
      });
    }),

  /** Counts for the dashboard: site-wide, plus your workplace and team when you have them. */
  getAssignmentStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const { org, team } = await getWorkplace(ctx.db, userId);
    const withList = { amazonWishlistUrl: { not: null } };
    const unpicked = { id: { not: userId }, ownedWishlist: { none: { isActive: true } } };

    const [totalUsers, totalLinks, totalUnallocatedLinks, totalGiftsSent] = await Promise.all([
      ctx.db.user.count({ where: { ...withList, profileCompleted: true } }),
      ctx.db.user.count({ where: withList }),
      ctx.db.user.count({ where: { ...withList, ...unpicked } }),
      ctx.db.purchase.count(),
    ]);
    const live = org?.group.status === "ACTIVE";
    const [totalLinksInWorkplace, totalLinksInTeam] = await Promise.all([
      live ? ctx.db.user.count({ where: { ...withList, ...inGroup(org.group.id) } }) : undefined,
      live && team
        ? ctx.db.user.count({ where: { ...withList, ...inGroup(team.group.id) } })
        : undefined,
    ]);
    return {
      totalUsers,
      totalLinks,
      totalUnallocatedLinks,
      totalGiftsSent,
      totalLinksInWorkplace,
      totalLinksInTeam,
    };
  }),

  // Distribute initial 3 wishlists to current user
  requestInitialAssignments: protectedProcedure
    .use(requestLimit)
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      // Check if user has profile completed and wishlist URL
      const currentUser = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          profileCompleted: true,
          amazonWishlistUrl: true,
        },
      });

      if (!currentUser?.profileCompleted || !currentUser?.amazonWishlistUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Please complete your profile and add your wishlist URL first",
        });
      }

      const scope = await requireGiverScope(ctx.db, userId, { needTeam: true });

      // Check if user already has assignments
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
        select: { wishlistOwnerId: true },
      });
      const assignedUserIds = existingAssignments.map(
        (a: { wishlistOwnerId: string }) => a.wishlistOwnerId,
      );

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
            inGroup(scope.teamId!), // Same team (department) only
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
        .map(
          (user: {
            id: string;
            name: string | null;
            ownedWishlist: { assignedUserId: string }[];
          }) => ({
            ...user,
            assignmentCount: user.ownedWishlist.length,
          }),
        )
        .sort(
          (a: { assignmentCount: number }, b: { assignmentCount: number }) =>
            a.assignmentCount - b.assignmentCount,
        );

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
        selectedUsers.map((user: { id: string }) =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  amazonWishlistUrl: true,
                },
              },
            },
          }),
        ),
      );

      return assignments;
    }),

  // Request additional assignments beyond the initial 3
  requestAdditionalAssignments: protectedProcedure
    .use(requestLimit)
    .input(
      z.object({
        count: z.number().min(1).max(5).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const scope = await requireGiverScope(ctx.db, userId, { needTeam: true });

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

      const assignedUserIds = existingAssignments.map(
        (a: { wishlistOwnerId: string }) => a.wishlistOwnerId,
      ); // Get eligible users (excluding already assigned ones, same domain/department only)
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: assignedUserIds } },
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            inGroup(scope.teamId!), // Same team (department) only
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
        .map(
          (user: {
            id: string;
            name: string | null;
            ownedWishlist: { assignedUserId: string }[];
          }) => ({
            ...user,
            assignmentCount: user.ownedWishlist.length,
          }),
        )
        .sort(
          (a: { assignmentCount: number }, b: { assignmentCount: number }) =>
            a.assignmentCount - b.assignmentCount,
        );

      const selectedUsers = sortedUsers.slice(0, input.count);

      if (selectedUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No additional wishlists available for assignment",
        });
      }

      // Create assignments
      const assignments = await Promise.all(
        selectedUsers.map((user: { id: string }) =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  amazonWishlistUrl: true,
                },
              },
            },
          }),
        ),
      );

      return assignments;
    }),

  // Request cross-department assignments when same-department ones are not available
  requestCrossDepartmentAssignments: protectedProcedure
    .use(requestLimit)
    .input(
      z.object({
        count: z.number().min(1).max(3).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const scope = await requireGiverScope(ctx.db, userId, {
        needTeam: false,
      });

      // Get users already assigned to this user
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
        select: { wishlistOwnerId: true },
      });

      const assignedUserIds = existingAssignments.map(
        (a: { wishlistOwnerId: string }) => a.wishlistOwnerId,
      );

      // Get eligible users from same domain but different departments
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: assignedUserIds } },
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            inOrgOutsideTeam(scope.orgId, scope.teamId), // Same organisation, other teams
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
        .map(
          (user: {
            id: string;
            name: string | null;
            ownedWishlist: { assignedUserId: string }[];
          }) => ({
            ...user,
            assignmentCount: user.ownedWishlist.length,
          }),
        )
        .sort(
          (a: { assignmentCount: number }, b: { assignmentCount: number }) =>
            a.assignmentCount - b.assignmentCount,
        );

      const selectedUsers = sortedUsers.slice(0, input.count);

      if (selectedUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cross-department wishlists available for assignment",
        });
      } // Create assignments
      const assignments = await Promise.all(
        selectedUsers.map((user: { id: string }) =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  amazonWishlistUrl: true,
                },
              },
            },
          }),
        ),
      );

      return assignments;
    }),

  // Request cross-domain (stranger) assignments when no more are available in user's domain
  requestCrossDomainAssignments: protectedProcedure
    .use(requestLimit)
    .input(
      z.object({
        count: z.number().min(1).max(3).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const scope = await requireGiverScope(ctx.db, userId, {
        needTeam: false,
      });

      // Get users already assigned to this user
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
        },
        select: { wishlistOwnerId: true },
      });
      const assignedUserIds = existingAssignments.map(
        (a: { wishlistOwnerId: string }) => a.wishlistOwnerId,
      );

      // Get eligible users from a different domain
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: assignedUserIds } },
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            inOtherActiveOrg(scope.orgId), // Another approved organisation
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
      }); // Sort by assignment count (prioritize users with fewer assignments)
      const sortedUsers = eligibleUsers
        .map(
          (user: {
            id: string;
            name: string | null;
            firstName: string | null;
            lastName: string | null;
            amazonWishlistUrl: string | null;
            ownedWishlist: { assignedUserId: string }[];
          }) => ({
            ...user,
            assignmentCount: user.ownedWishlist.length,
          }),
        )
        .sort(
          (a: { assignmentCount: number }, b: { assignmentCount: number }) =>
            a.assignmentCount - b.assignmentCount,
        );

      const selectedUsers = sortedUsers.slice(0, input.count);

      if (selectedUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cross-domain wishlists available for assignment",
        });
      } // Create assignments (do not include department/domain info in return)
      const assignments = await Promise.all(
        selectedUsers.map((user: { id: string }) =>
          ctx.db.wishlistAssignment.create({
            data: {
              assignedUserId: userId,
              wishlistOwnerId: user.id,
            },
            include: {
              wishlistOwner: {
                select: {
                  id: true,
                  amazonWishlistUrl: true,
                  // No department/domain info for privacy
                },
              },
            },
          }),
        ),
      );

      return assignments;
    }),

  // Mark a purchase as completed
  /**
   * Day 14: pick up wishlists inside a friends or community group you're in.
   * Fewest-gifted first, never yourself or someone you already hold.
   */
  requestFromGroup: protectedProcedure
    .use(requestLimit)
    .input(
      z.object({
        groupId: z.string(),
        count: z.number().min(1).max(3).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.membership.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
        select: { group: { select: { kind: true, status: true } } },
      });
      if (
        !membership ||
        !["FRIENDS", "COMMUNITY"].includes(membership.group.kind)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You're not in that group.",
        });
      }
      if (membership.group.status !== "ACTIVE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This group is waiting for approval, so gifting hasn't opened yet.",
        });
      }
      const me = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { profileCompleted: true, amazonWishlistUrl: true },
      });
      if (!me?.profileCompleted || !me.amazonWishlistUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Add your wishlist to your profile first, so others can pick you up too.",
        });
      }
      const held = await ctx.db.wishlistAssignment.findMany({
        where: { assignedUserId: userId },
        select: { wishlistOwnerId: true },
      });
      const eligible = await ctx.db.user.findMany({
        where: {
          id: { notIn: [userId, ...held.map((h) => h.wishlistOwnerId)] },
          profileCompleted: true,
          amazonWishlistUrl: { not: null },
          memberships: { some: { groupId: input.groupId } },
        },
        select: {
          id: true,
          ownedWishlist: { where: { isActive: true }, select: { id: true } },
        },
      });
      if (eligible.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No more wishlists in this group right now. Invite a few more people!",
        });
      }
      const picks = eligible
        .map((u) => ({
          id: u.id,
          load: u.ownedWishlist.length,
          r: Math.random(),
        }))
        .sort((a, b) => a.load - b.load || a.r - b.r)
        .slice(0, input.count);
      await ctx.db.wishlistAssignment.createMany({
        data: picks.map((p) => ({
          assignedUserId: userId,
          wishlistOwnerId: p.id,
          groupId: input.groupId,
        })),
        skipDuplicates: true,
      });
      return { count: picks.length };
    }),

  markPurchase: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        notes: z.string().optional(),
      }),
    )
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
                select: { id: true },
              },
            },
          },
        },
      });

      return purchase;
    }),

  // Report an issue with a wishlist
  reportIssue: protectedProcedure
    .use(rateLimit("wishlist.report", 30, HOUR))
    .input(
      z.object({
        assignmentId: z.string(),
        reportType: z.enum(["NO_ITEMS", "DOESNT_EXIST", "NO_ADDRESS", "OTHER"]),
        description: z.string().optional(),
      }),
    )
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
                select: { id: true },
              },
            },
          },
        },
      });

      return report;
    }),

  // Clear report when issue is fixed
  clearReport: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
      }),
    )
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

  // Archive or unarchive an assignment (visible only to assigned user)
  archiveAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.string(), archive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

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
          message: "Assignment not found",
        });
      }

      const updated = await ctx.db.wishlistAssignment.update({
        where: { id: input.assignmentId },
        data: { archived: input.archive },
      });

      return updated;
    }),

  // Unassign an assignment so it becomes available to others
  unassignAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const assignment = await ctx.db.wishlistAssignment.findFirst({
        where: {
          id: input.assignmentId,
          assignedUserId: userId,
          isActive: true,
        },
        include: { purchases: true, reports: true },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      if (assignment.purchases) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot unassign a purchased wishlist",
        });
      }

      if (assignment.reports && assignment.reports.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot unassign a reported wishlist",
        });
      }

      // Delete the assignment so it becomes unallocated
      await ctx.db.wishlistAssignment.delete({
        where: { id: input.assignmentId },
      });

      return { success: true };
    }),

  // Undo purchase marking
  undoPurchase: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
      }),
    )
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
      } // Delete the purchase record
      await ctx.db.purchase.deleteMany({
        where: {
          wishlistAssignmentId: input.assignmentId,
        },
      });

      return { success: true };
    }),
});

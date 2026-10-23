import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
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
import { affiliateFor, getAffiliateSettings, giftPageFor, storeOfUrl } from "~/server/affiliate";
import { cleanWishlistUrl } from "~/lib/wishlist";
import { fairShareFields, pickFairly, roomToPickUp } from "~/server/fair-share";
import { getWorkplace } from "~/server/groups";
import {
  archivePastSeasons,
  checkedIn,
  currentSeason,
  inSeasonWindow,
  requireCanPickUp,
} from "~/server/season";

const HOUR = 60 * 60_000;
// Picking up wishlists hands out other people's links, so cap how fast one
// person can draw them.
const requestLimit = rateLimit("wishlist.request", 30, HOUR);

/** Owners this person has been given this season, in any state: never twice in one. */
async function ownersHeldThisSeason(db: PrismaClient, userId: string) {
  const rows = await db.wishlistAssignment.findMany({
    where: { assignedUserId: userId, season: currentSeason() },
    select: { wishlistOwnerId: true },
  });
  return rows.map((r) => r.wishlistOwnerId);
}

export const wishlistRouter = createTRPCRouter({
  // Get the current user's assigned wishlists (links they can shop from)
  // Workplace pick-ups by default; pass a friends/community group id for that
  // group's (Day 14)
  getMyAssignments: protectedProcedure
    .input(z.object({ groupId: z.string().nullable() }).nullish())
    .query(async ({ ctx, input }) => {
      await archivePastSeasons(ctx.db);
      const assignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: ctx.session.user.id,
          isActive: true,
          groupId: input?.groupId ?? null,
        },
        include: {
          // Never send the owner's name, or their id (an organiser could look
          // it up), to the person buying for them: gifts are anonymous both
          // ways (see /privacy).
          wishlistOwner: { select: { amazonWishlistUrl: true } },
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
      // Affiliate links (20 Oct): when they're on for the group a list was
      // picked up in (a friends/community group, else your workplace), it is
      // opened from its public gift page; otherwise straight from Amazon.
      const settings = await getAffiliateSettings(ctx.db);
      const affiliate = new Map<string, boolean>();
      const linkFor = async (a: (typeof assignments)[number]) => {
        const raw = a.wishlistOwner.amazonWishlistUrl;
        const url = raw ? cleanWishlistUrl(raw) : null;
        const contextId = a.groupId ?? org?.group.id;
        if (!url || !contextId || !settings.enabled) return url;
        // stores we have no Associates account for can't be tagged: straight to Amazon
        if (!storeOfUrl(url)) return url;
        if (!affiliate.has(contextId)) {
          const on = await affiliateFor(ctx.db, contextId, undefined, settings);
          affiliate.set(contextId, on.enabled);
        }
        if (!affiliate.get(contextId)) return url;
        return `/gift/${await giftPageFor(ctx.db, a.wishlistOwnerId, contextId, url)}`;
      };
      const links = await Promise.all(assignments.map(linkFor));

      return assignments.map((a, i) => {
        const link = links[i] ?? null;
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropped on purpose
        const { wishlistOwnerId: _owner, ...rest } = a;
        return {
          ...rest,
          from,
          fromTeam: from === "otherTeam" ? theirTeam!.name : null,
          /** Where "open wishlist" goes: our gift page (affiliate on) or Amazon */
          link,
          viaGiftPage: !!link?.startsWith("/gift/"),
        };
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
      await requireCanPickUp(ctx.db, userId, scope.orgId);

      // Check if user already has workplace assignments (group pick-ups don't count)
      const existingAssignments = await ctx.db.wishlistAssignment.findMany({
        where: {
          assignedUserId: userId,
          isActive: true,
          groupId: null,
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
            { id: { notIn: await ownersHeldThisSeason(ctx.db, userId) } }, // never twice in a season
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            checkedIn(), // checked in for this season (Day 18)
            inGroup(scope.teamId!), // Same team (department) only
          ],
        },
        select: fairShareFields(),
      });


      // Up to 3, fairest first (Day 19), within what they may still hold
      const neededAssignments = 3 - assignedUserIds.length;
      const selectedUsers = pickFairly(
        eligibleUsers,
        await roomToPickUp(ctx.db, userId, neededAssignments),
      );
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
              season: currentSeason(),
            },
            include: {
              // never the owner's id: buyers mustn't be able to look them up
              wishlistOwner: { select: { amazonWishlistUrl: true } },
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
      await requireCanPickUp(ctx.db, userId, scope.orgId);

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

      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: await ownersHeldThisSeason(ctx.db, userId) } }, // never twice in a season
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            checkedIn(), // checked in for this season (Day 18)
            inGroup(scope.teamId!), // Same team (department) only
          ],
        },
        select: fairShareFields(),
      });


      const selectedUsers = pickFairly(
        eligibleUsers,
        await roomToPickUp(ctx.db, userId, input.count),
      );

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
              season: currentSeason(),
            },
            include: {
              // never the owner's id: buyers mustn't be able to look them up
              wishlistOwner: { select: { amazonWishlistUrl: true } },
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
      await requireCanPickUp(ctx.db, userId, scope.orgId);


      // Get eligible users from same domain but different departments
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: await ownersHeldThisSeason(ctx.db, userId) } }, // never twice in a season
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            checkedIn(), // checked in for this season (Day 18)
            inOrgOutsideTeam(scope.orgId, scope.teamId), // Same organisation, other teams
          ],
        },
        select: fairShareFields(),
      });


      const selectedUsers = pickFairly(
        eligibleUsers,
        await roomToPickUp(ctx.db, userId, input.count),
      );

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
              season: currentSeason(),
            },
            include: {
              // never the owner's id: buyers mustn't be able to look them up
              wishlistOwner: { select: { amazonWishlistUrl: true } },
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
      await requireCanPickUp(ctx.db, userId, scope.orgId);

      const outsideWindow = !(await inSeasonWindow(ctx.db));
      // Get eligible users from a different domain
      const eligibleUsers = await ctx.db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { id: { notIn: await ownersHeldThisSeason(ctx.db, userId) } }, // never twice in a season
            { profileCompleted: true },
            { amazonWishlistUrl: { not: null } },
            checkedIn(), // checked in for this season (Day 18)
            inOtherActiveOrg(scope.orgId), // Another approved organisation
            // ...that is open too: before the season, only ones opened early
            ...(outsideWindow
              ? [{ memberships: { some: { group: { kind: "ORG" as const, openEarlySeason: currentSeason() } } } }]
              : []),
          ],
        },
        // no names: buyers never learn whose list it is
        select: fairShareFields(),
      });

      const selectedUsers = pickFairly(
        eligibleUsers,
        await roomToPickUp(ctx.db, userId, input.count),
      );

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
              season: currentSeason(),
            },
            include: {
              // never the owner's id or any group info: buyers stay in the dark
              wishlistOwner: { select: { amazonWishlistUrl: true } },
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
      await requireCanPickUp(ctx.db, userId, input.groupId);
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
      // lists you've had this season (earlier seasons' can come round again)
      const held = await ownersHeldThisSeason(ctx.db, userId);
      const eligible = await ctx.db.user.findMany({
        where: {
          id: { notIn: [userId, ...held] },
          profileCompleted: true,
          amazonWishlistUrl: { not: null },
          memberships: { some: { groupId: input.groupId } },
          ...checkedIn(),
        },
        select: fairShareFields(),
      });
      if (eligible.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No more wishlists in this group right now. Invite a few more people!",
        });
      }
      // fairest first (Day 19), within what they may still hold
      const picks = pickFairly(eligible, await roomToPickUp(ctx.db, userId, input.count));
      const created = await ctx.db.wishlistAssignment.createMany({
        data: picks.map((p) => ({
          assignedUserId: userId,
          wishlistOwnerId: p.id,
          groupId: input.groupId,
          season: currentSeason(),
        })),
        skipDuplicates: true,
      });
      if (created.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No more wishlists in this group right now. Invite a few more people!",
        });
      }
      return { count: created.count };
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

      // Create the purchase record. The buyer gets the purchase only, never
      // the owner's id (anonymity).
      return ctx.db.purchase.create({
        data: {
          userId,
          wishlistAssignmentId: input.assignmentId,
          notes: input.notes,
        },
      });
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

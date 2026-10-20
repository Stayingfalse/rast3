import { TRPCError } from "@trpc/server";
import sharp from "sharp";
import { z } from "zod";
import { db } from "~/server/db";
import { getMemberships, inGroup } from "~/server/scope";
import {
  checkAdminPermissions,
  inAnyGroup,
} from "~/server/utils/admin-permissions";
import { deleteFromE2, uploadToE2 } from "~/server/utils/e2-upload";
import { createChildLogger } from "~/utils/logger";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  rateLimit,
} from "../trpc";

const logger = createChildLogger('kudos');

export const kudosRouter = createTRPCRouter({
  createKudos: protectedProcedure
    .use(rateLimit("kudos.create", 20, 60 * 60_000))
    .input(
      z.object({
        message: z.string().min(1).max(500),
        purchaseId: z.string().optional(),
        images: z.array(z.string()).max(5), // base64 strings
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // A thank-you can only be tied to a gift you received
      if (input.purchaseId) {
        const purchase = await db.purchase.findUnique({
          where: { id: input.purchaseId },
          select: { wishlistAssignment: { select: { wishlistOwnerId: true } } },
        });
        if (purchase?.wishlistAssignment.wishlistOwnerId !== ctx.session.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "That isn't a gift you received." });
        }
      }
      // Optimize and upload images to iDrive E2
      const imageUrls: string[] = [];
      for (const img of input.images) {
        const buffer = Buffer.from(img, "base64");
        const optimized = await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        const url = await uploadToE2(optimized, "image/jpeg");
        imageUrls.push(url);
      }
      // Save Kudos post
      const kudos = await db.kudos.create({
        data: {
          userId: ctx.session.user.id,
          purchaseId: input.purchaseId,
          message: input.message,
          images: JSON.stringify(imageUrls),
        },
      });
      return kudos;
    }),
  getFeed: publicProcedure
    .input(
      z.object({
        scope: z.enum(["team", "workplace", "site"]),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if current user has admin permissions
      let currentUser = null;
      let userPermissions = null;

      if (ctx.session?.user?.id) {
        currentUser = await db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { id: true },
        });

        userPermissions = await checkAdminPermissions(ctx.session.user.id);
      } // Build the where clause step by step
      let whereClause: Record<string, unknown> = {};

      // Step 1: Apply scope filtering (team/workplace/site)
      let scopeFilter: Record<string, unknown> = {};
      // Team and organisation feeds go by group membership (Day 9)
      const mine = currentUser
        ? await getMemberships(db, currentUser.id)
        : null;
      if (input.scope === "team" && mine?.team) {
        scopeFilter = { user: inGroup(mine.team.id) };
      } else if (input.scope === "workplace" && mine?.org) {
        scopeFilter = { user: inGroup(mine.org.id) };
      }
      // For "site" scope or unauthenticated users, no scope filter needed

      // Step 2: Apply hidden post visibility rules based on admin level
      if (!userPermissions?.canModerate) {
        // Regular users: only see non-hidden posts
        whereClause = {
          hidden: false,
          ...scopeFilter,
        };
      } else if (userPermissions.adminLevel === "SITE") {
        // Site admins: see everything (all posts including hidden)
        whereClause = scopeFilter;
      } else {
        // Organisers: all non-hidden posts, plus hidden ones from the groups they run
        whereClause = {
          OR: [
            {
              hidden: false,
              ...scopeFilter,
            },
            {
              AND: [
                { hidden: true },
                { user: inAnyGroup(userPermissions.groupIds ?? []) },
                ...(Object.keys(scopeFilter).length > 0 ? [scopeFilter] : []),
              ],
            },
          ],
        };
      }

      const kudos = await db.kudos.findMany({
        where: {
          ...whereClause,
          ...(input.cursor && {
            createdAt: {
              lt: new Date(input.cursor),
            },
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              firstName: true,
              lastName: true,
              memberships: { select: { groupId: true } },
            },
          },
          purchase: {
            select: {
              wishlistAssignment: {
                select: {
                  wishlistOwner: { select: { id: true } },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit + 1, // Take one extra to determine if there are more
      });

      const hasNextPage = kudos.length > input.limit;
      const page = hasNextPage ? kudos.slice(0, -1) : kudos;

      // The feed is public and shows posters under festive names, so real
      // identities only go to organisers who could moderate the post.
      const moderates = new Set(userPermissions?.groupIds ?? []);
      const seesIdentity = (memberships: { groupId: string }[]) =>
        userPermissions?.adminLevel === "SITE" ||
        memberships.some((m) => moderates.has(m.groupId));

      const results = page.map(
        ({ user: { memberships, ...user }, ...item }) => ({
          ...item,
          user: seesIdentity(memberships)
            ? user
            : {
                id: user.id,
                name: null,
                image: null,
                firstName: null,
                lastName: null,
              },
        }),
      );
      const nextCursor = hasNextPage
        ? results[results.length - 1]?.createdAt.toISOString()
        : undefined;

      return {
        items: results,
        nextCursor,
        hasNextPage,
      };
    }),

  getRecommendedScope: publicProcedure.query(async ({ ctx }) => {
    // Signed out: the public, site-wide feed
    if (!ctx.session?.user?.id) return "site";
    const { org, team } = await getMemberships(db, ctx.session.user.id);
    if (org?.status !== "ACTIVE") return "site";
    return team ? "team" : "workplace";
  }),

  // Check if a scope has content
  teamHasContent: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) return false;
    const { team } = await getMemberships(db, ctx.session.user.id);
    if (!team) return false;
    const count = await db.kudos.count({
      where: { user: inGroup(team.id), hidden: false },
    });
    return count > 0;
  }),

  workplaceHasContent: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) return false;
    const { org } = await getMemberships(db, ctx.session.user.id);
    if (!org) return false;
    const count = await db.kudos.count({
      where: { user: inGroup(org.id), hidden: false },
    });
    return count > 0;
  }),

  // Admin: Hide/unhide a kudos post
  adminHideKudos: protectedProcedure
    .input(
      z.object({
        kudosId: z.string(),
        hidden: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First get the kudos to check ownership
      const kudos = await db.kudos.findUnique({
        where: { id: input.kudosId },
        include: { user: { select: { id: true } } },
      });

      if (!kudos) {
        throw new Error("Kudos not found");
      }

      // Check admin permissions
      const permissions = await checkAdminPermissions(
        ctx.session.user.id,
        kudos.user.id,
      );
      if (!permissions.canModerate) {
        throw new Error("Insufficient permissions to moderate this content");
      }

      // Update the hidden status
      return db.kudos.update({
        where: { id: input.kudosId },
        data: {
          hidden: input.hidden,
          moderatedBy: ctx.session.user.id,
          moderatedAt: new Date(),
        },
      });
    }),

  // Admin: Delete a kudos post and clean up files
  adminDeleteKudos: protectedProcedure
    .input(
      z.object({
        kudosId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First get the kudos to check ownership and get image URLs
      const kudos = await db.kudos.findUnique({
        where: { id: input.kudosId },
        include: { user: { select: { id: true } } },
      });

      if (!kudos) {
        throw new Error("Kudos not found");
      }

      // Check admin permissions
      const permissions = await checkAdminPermissions(
        ctx.session.user.id,
        kudos.user.id,
      );
      if (!permissions.canModerate) {
        throw new Error("Insufficient permissions to delete this content");
      }      // Parse and clean up image files if they exist
      if (kudos.images) {
        let imageUrls: string[] = [];
        try {
          imageUrls = JSON.parse(kudos.images) as string[];
          // Delete each image from E2 storage
          await Promise.all(imageUrls.map((url) => deleteFromE2(url)));
        } catch (error) {
          logger.error({
            error: error instanceof Error ? error.message : String(error),
            kudosId: input.kudosId,
            imageUrls,
            operation: "admin_delete_kudos"
          }, "Error cleaning up image files");
          // Continue with deletion even if file cleanup fails
        }
      }

      // Delete the kudos record
      return db.kudos.delete({
        where: { id: input.kudosId },
      });
    }),

  // Check if current user has admin permissions
  checkAdminPermissions: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return checkAdminPermissions(ctx.session.user.id, input.targetUserId);
    }),
});

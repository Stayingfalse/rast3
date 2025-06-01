import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "~/server/db";
import sharp from "sharp";
import { uploadToE2, deleteFromE2 } from "~/server/utils/e2-upload";
import { checkAdminPermissions } from "~/server/utils/admin-permissions";

export const kudosRouter = createTRPCRouter({
  createKudos: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(500),
        purchaseId: z.string().optional(),
        images: z.array(z.string()).max(5), // base64 strings
      })
    )
    .mutation(async ({ ctx, input }) => {
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
        scope: z.enum(["department", "domain", "site"]),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if current user has admin permissions
      let currentUser = null;
      let userPermissions = null;
      
      if (ctx.session?.user?.id) {
        currentUser = await db.user.findUnique({
          where: { id: ctx.session.user.id },
          include: {
            department: true,
          },
        });
        
        userPermissions = await checkAdminPermissions(ctx.session.user.id);
      }      // Build the where clause step by step
      let whereClause: Record<string, unknown> = {};

      // Step 1: Apply scope filtering (department/domain/site)
      let scopeFilter: Record<string, unknown> = {};
      if (currentUser && input.scope === "department" && currentUser.departmentId) {
        scopeFilter = { user: { departmentId: currentUser.departmentId } };
      } else if (currentUser && input.scope === "domain" && currentUser.domain) {
        scopeFilter = { user: { domain: currentUser.domain } };
      }
      // For "site" scope or unauthenticated users, no scope filter needed

      // Step 2: Apply hidden post visibility rules based on admin level
      if (!userPermissions?.canModerate) {
        // Regular users: only see non-hidden posts
        whereClause = {
          hidden: false,
          ...scopeFilter
        };
      } else if (userPermissions.adminLevel === "SITE") {
        // Site admins: see everything (all posts including hidden)
        whereClause = scopeFilter;
      } else {
        // Domain/Department admins: complex filtering needed
        if (userPermissions.adminLevel === "DOMAIN") {
          // Domain admin: see all non-hidden posts + hidden posts only from their domain
          whereClause = {
            OR: [
              { 
                hidden: false,
                ...scopeFilter
              },
              { 
                AND: [
                  { hidden: true },
                  { user: { domain: userPermissions.scope } },
                  ...(Object.keys(scopeFilter).length > 0 ? [scopeFilter] : [])
                ]
              }
            ]
          };
        } else if (userPermissions.adminLevel === "DEPARTMENT") {
          // Department admin: see all non-hidden posts + hidden posts only from their department
          whereClause = {
            OR: [
              { 
                hidden: false,
                ...scopeFilter
              },
              { 
                AND: [
                  { hidden: true },
                  { user: { departmentId: userPermissions.scope } },
                  ...(Object.keys(scopeFilter).length > 0 ? [scopeFilter] : [])
                ]
              }
            ]
          };
        }
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
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
          purchase: {
            include: {
              wishlistAssignment: {
                include: {
                  wishlistOwner: {
                    select: {
                      id: true,
                      name: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
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
      const results = hasNextPage ? kudos.slice(0, -1) : kudos;
      const nextCursor = hasNextPage ? results[results.length - 1]?.createdAt.toISOString() : undefined;

      return {
        items: results,
        nextCursor,
        hasNextPage,
      };
    }),

  getRecommendedScope: publicProcedure
    .query(async ({ ctx }) => {
      // For unauthenticated users, default to site
      if (!ctx.session?.user?.id) {
        return "site";
      }

      const currentUser = await db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          department: true,
        },
      });

      if (!currentUser) {
        return "site";
      }

      // Check if user has a department and it's valid
      if (currentUser.departmentId && currentUser.department) {
        return "department";
      }

      // Check if user has a domain and it's enabled
      if (currentUser.domain) {
        const domain = await db.domain.findUnique({
          where: { name: currentUser.domain },
        });
        if (domain?.enabled) {
          return "domain";
        }
      }

      // Default to site
      return "site";
    }),

  // Admin: Hide/unhide a kudos post
  adminHideKudos: protectedProcedure
    .input(z.object({
      kudosId: z.string(),
      hidden: z.boolean(),
    }))
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
      const permissions = await checkAdminPermissions(ctx.session.user.id, kudos.user.id);
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
    .input(z.object({
      kudosId: z.string(),
    }))
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
      const permissions = await checkAdminPermissions(ctx.session.user.id, kudos.user.id);
      if (!permissions.canModerate) {
        throw new Error("Insufficient permissions to delete this content");
      }

      // Parse and clean up image files if they exist
      if (kudos.images) {
        try {
          const imageUrls = JSON.parse(kudos.images) as string[];
          // Delete each image from E2 storage
          await Promise.all(imageUrls.map(url => deleteFromE2(url)));
        } catch (error) {
          console.error("Error cleaning up image files:", error);
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
    .input(z.object({
      targetUserId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return checkAdminPermissions(ctx.session.user.id, input.targetUserId);
    }),
});

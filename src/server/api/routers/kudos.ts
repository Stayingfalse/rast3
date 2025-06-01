import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "~/server/db";
import sharp from "sharp";
import { uploadToE2 } from "~/server/utils/e2-upload";

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
    .query(async ({ ctx, input }) => {      // For unauthenticated users, default to site scope
      let whereClause: { user?: { departmentId?: string; domain?: string } } = {};

      if (ctx.session?.user?.id) {
        const currentUser = await db.user.findUnique({
          where: { id: ctx.session.user.id },
          include: {
            department: true,
          },
        });

        if (currentUser && input.scope === "department" && currentUser.departmentId) {
          // Get users in same department
          whereClause = {
            user: {
              departmentId: currentUser.departmentId,
            },
          };
        } else if (currentUser && input.scope === "domain" && currentUser.domain) {
          // Get users in same domain
          whereClause = {
            user: {
              domain: currentUser.domain,
            },
          };
        }
      }
      // For "site" scope or unauthenticated users, no additional where clause needed (all kudos)

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
});

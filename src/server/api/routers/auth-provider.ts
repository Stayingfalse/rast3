import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const authProviderSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  clientId: z.string().optional().nullable(),
  clientSecret: z.string().optional().nullable(),
  enabled: z.boolean().default(false),
  isEmailProvider: z.boolean().default(false),
  emailConfig: z.any().optional().nullable(), // Allow any JSON value
});

export const authProviderRouter = createTRPCRouter({
  // Get all auth providers
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Only SITE admins can manage auth providers
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (user?.adminLevel !== "SITE") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only site administrators can manage authentication providers",
      });
    }    return ctx.db.authProvider.findMany({
      orderBy: { displayName: "asc" },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }),

  // Create a new auth provider
  create: protectedProcedure
    .input(authProviderSchema)
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can manage auth providers
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can manage authentication providers",
        });
      }

      return ctx.db.authProvider.create({
        data: {
          ...input,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  // Update an auth provider
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: authProviderSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can manage auth providers
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can manage authentication providers",
        });
      }

      return ctx.db.authProvider.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  // Delete an auth provider
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can manage auth providers
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can manage authentication providers",
        });
      }

      return ctx.db.authProvider.delete({
        where: { id: input.id },
      });
    }),

  // Toggle provider enabled status
  toggleEnabled: protectedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can manage auth providers
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can manage authentication providers",
        });
      }

      return ctx.db.authProvider.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
    }),

  // Get environment variables status for each provider
  getEnvStatus: protectedProcedure.query(async ({ ctx }) => {
    // Only SITE admins can view env status
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (user?.adminLevel !== "SITE") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only site administrators can view environment status",
      });
    }

    // Check which providers have environment variables set
    const envStatus = {
      github: !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
      google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      discord: !!(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
      twitch: !!(process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET),
      reddit: !!(process.env.AUTH_REDDIT_ID && process.env.AUTH_REDDIT_SECRET),
      instagram: !!(process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET),
      facebook: !!(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
      tiktok: !!(process.env.AUTH_TIKTOK_ID && process.env.AUTH_TIKTOK_SECRET),
      nodemailer: !!(process.env.EMAIL_SERVER_HOST),
    };

    return envStatus;
  }),
});

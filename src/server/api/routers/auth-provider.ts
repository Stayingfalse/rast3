import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
    }
    return ctx.db.authProvider.findMany({
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
          message:
            "Only site administrators can manage authentication providers",
        });
      } // If this is an OAuth2 email provider, automatically add Google credentials
      const finalInput = { ...input };
      if (input.isEmailProvider && input.emailConfig) {
        const emailConfig = input.emailConfig as Record<string, unknown>;
        if (emailConfig.authType === "oauth2") {
          emailConfig.clientId = process.env.AUTH_GOOGLE_ID;
          emailConfig.clientSecret = process.env.AUTH_GOOGLE_SECRET;
          finalInput.emailConfig = emailConfig;
        }
      }

      return ctx.db.authProvider.create({
        data: {
          ...finalInput,
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can manage auth providers
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only site administrators can manage authentication providers",
        });
      } // If this is an OAuth2 email provider, automatically add Google credentials
      const finalData = { ...input.data };
      if (input.data.isEmailProvider && input.data.emailConfig) {
        const emailConfig = input.data.emailConfig as Record<string, unknown>;
        if (emailConfig.authType === "oauth2") {
          emailConfig.clientId = process.env.AUTH_GOOGLE_ID;
          emailConfig.clientSecret = process.env.AUTH_GOOGLE_SECRET;
          finalData.emailConfig = emailConfig;
        }
      }

      return ctx.db.authProvider.update({
        where: { id: input.id },
        data: finalData,
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
          message:
            "Only site administrators can manage authentication providers",
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
          message:
            "Only site administrators can manage authentication providers",
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
      discord: !!(
        process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
      ),
      twitch: !!(process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET),
      reddit: !!(process.env.AUTH_REDDIT_ID && process.env.AUTH_REDDIT_SECRET),
      instagram: !!(
        process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET
      ),
      facebook: !!(
        process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ),
      tiktok: !!(process.env.AUTH_TIKTOK_ID && process.env.AUTH_TIKTOK_SECRET),
      nodemailer: !!process.env.EMAIL_SERVER_HOST,
    };
    return envStatus;
  }),

  // Get OAuth2 tokens from current user's Google account (uses NextAuth.js)
  getGoogleTokensFromAuth: protectedProcedure.query(async ({ ctx }) => {
    // Only SITE admins can use OAuth2 flow
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (user?.adminLevel !== "SITE") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only site administrators can use OAuth2 flow",
      });
    }

    // Get the user's Google account from NextAuth.js
    const googleAccount = await ctx.db.account.findFirst({
      where: {
        userId: ctx.session.user.id,
        provider: "google",
      },
    });

    if (!googleAccount) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "No Google account found. Please sign in with Google first to use this feature.",
      });
    }

    // Check if we have the required tokens
    if (!googleAccount.access_token || !googleAccount.refresh_token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Google account does not have required OAuth2 tokens. Please re-authenticate with Google.",
      });
    }
    return {
      accessToken: googleAccount.access_token,
      refreshToken: googleAccount.refresh_token,
      tokenType: googleAccount.token_type ?? "Bearer",
      scope: googleAccount.scope,
      expiresAt: googleAccount.expires_at,
    };
  }),

  // Generate OAuth2 authorization URL for Gmail access (admin email setup only)
  generateGmailOAuth2Url: protectedProcedure
    .input(
      z.object({
        redirectUri: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can use OAuth2 flow
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can use OAuth2 flow",
        });
      }

      if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Google OAuth2 is not configured. Please set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in your environment variables.",
        });
      }

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", process.env.AUTH_GOOGLE_ID);
      authUrl.searchParams.set("redirect_uri", input.redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://mail.google.com/"); // Gmail scope for email sending
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", "admin_email_setup"); // Identify this as admin flow      console.log('🔍 Gmail OAuth2 URL generated for admin email setup');
      console.log("Redirect URI:", input.redirectUri);
      console.log("Generated Auth URL:", authUrl.toString());

      return { authUrl: authUrl.toString() };
    }),

  // Exchange OAuth2 authorization code for Gmail tokens (admin email setup only)
  exchangeGmailOAuth2Code: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        redirectUri: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can use OAuth2 flow
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can use OAuth2 flow",
        });
      }

      if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Google OAuth2 is not configured. Please set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in your environment variables.",
        });
      }

      try {
        console.log("🔍 Gmail Token Exchange Debug Info:");
        console.log("Code received:", input.code.substring(0, 20) + "...");
        console.log("Redirect URI:", input.redirectUri);

        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              code: input.code,
              client_id: process.env.AUTH_GOOGLE_ID,
              client_secret: process.env.AUTH_GOOGLE_SECRET,
              redirect_uri: input.redirectUri,
              grant_type: "authorization_code",
            }),
          },
        );

        if (!tokenResponse.ok) {
          const errorData = (await tokenResponse.json()) as {
            error_description?: string;
            error?: string;
          };

          console.error("❌ Gmail OAuth2 Token Exchange Failed:");
          console.error("Status:", tokenResponse.status);
          console.error("Status Text:", tokenResponse.statusText);
          console.error("Error Data:", errorData);

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Gmail OAuth2 token exchange failed: ${errorData.error_description ?? errorData.error ?? "Unknown error"}`,
          });
        }

        const tokens = (await tokenResponse.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
          token_type: string;
          scope: string;
        };

        return {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        };
      } catch (error) {
        console.error("Gmail OAuth2 token exchange error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exchange authorization code for Gmail tokens",
        });
      }
    }),

  // Generate OAuth2 authorization URL for Google (legacy method)
  generateOAuth2Url: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        redirectUri: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can use OAuth2 flow
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can use OAuth2 flow",
        });
      }
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", input.clientId);
      authUrl.searchParams.set("redirect_uri", input.redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://mail.google.com/");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      // Debug logging (remove in production)
      console.log("🔍 OAuth2 Debug Info:");
      console.log("Client ID format check:", {
        clientId: input.clientId,
        isValidFormat: /^[0-9]+-[a-zA-Z0-9]+\.googleusercontent\.com$/.test(
          input.clientId,
        ),
        length: input.clientId.length,
      });
      console.log("Redirect URI:", input.redirectUri);
      console.log("Generated Auth URL:", authUrl.toString());

      return { authUrl: authUrl.toString() };
    }),

  // Exchange OAuth2 authorization code for tokens
  exchangeOAuth2Code: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only SITE admins can use OAuth2 flow
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.adminLevel !== "SITE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only site administrators can use OAuth2 flow",
        });
      }
      try {
        // Debug logging (remove in production)
        console.log("🔍 Token Exchange Debug Info:");
        console.log("Code received:", input.code.substring(0, 20) + "...");
        console.log("Client ID format check:", {
          clientId: input.clientId,
          isValidFormat: /^[0-9]+-[a-zA-Z0-9]+\.googleusercontent\.com$/.test(
            input.clientId,
          ),
        });
        console.log("Client Secret format check:", {
          hasSecret: !!input.clientSecret,
          secretLength: input.clientSecret.length,
          isValidFormat: /^[a-zA-Z0-9_-]{24,}$/.test(input.clientSecret),
        });
        console.log("Redirect URI:", input.redirectUri);

        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              code: input.code,
              client_id: input.clientId,
              client_secret: input.clientSecret,
              redirect_uri: input.redirectUri,
              grant_type: "authorization_code",
            }),
          },
        );
        if (!tokenResponse.ok) {
          const errorData = (await tokenResponse.json()) as {
            error_description?: string;
            error?: string;
          };

          // Enhanced error logging
          console.error("❌ OAuth2 Token Exchange Failed:");
          console.error("Status:", tokenResponse.status);
          console.error("Status Text:", tokenResponse.statusText);
          console.error("Error Data:", errorData);

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `OAuth2 token exchange failed: ${errorData.error_description ?? errorData.error ?? "Unknown error"}`,
          });
        }

        const tokens = (await tokenResponse.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
          token_type: string;
        };

        return {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type,
        };
      } catch (error) {
        console.error("OAuth2 token exchange error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exchange authorization code for tokens",
        });
      }
    }),
});

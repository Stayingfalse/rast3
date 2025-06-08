import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Instagram from "next-auth/providers/instagram";
import Nodemailer from "next-auth/providers/nodemailer";
import Reddit from "next-auth/providers/reddit";
import TikTok from "next-auth/providers/tiktok";
import Twitch from "next-auth/providers/twitch";
import { createTransport } from "nodemailer";
import { db } from "~/server/db";
import { createMagicLinkEmailTemplate } from "~/server/utils/email-templates";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger('server');

// Augment Session type to include adminLevel and adminScope
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      adminLevel?: "USER" | "DEPARTMENT" | "DOMAIN" | "SITE";
      adminScope?: string | null;
    } & DefaultSession["user"];
  }

  // Augment User type to include admin fields
  interface User {
    adminLevel?: "USER" | "DEPARTMENT" | "DOMAIN" | "SITE";
    adminScope?: string | null;
  }
}

// Create providers array - NextAuth doesn't support async providers
// We'll use a hybrid approach where env vars take precedence, but we provide
// a mechanism to use database configs when env vars aren't available
const providers = [];

// GitHub Provider
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Discord Provider
if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
  providers.push(
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Google Provider
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      // Default scope for normal user authentication - no Gmail access
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "select_account",
        },
      },
    }),
  );
}

// Twitch Provider
if (process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET) {
  providers.push(
    Twitch({
      clientId: process.env.AUTH_TWITCH_ID,
      clientSecret: process.env.AUTH_TWITCH_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Reddit Provider
if (process.env.AUTH_REDDIT_ID && process.env.AUTH_REDDIT_SECRET) {
  providers.push(
    Reddit({
      clientId: process.env.AUTH_REDDIT_ID,
      clientSecret: process.env.AUTH_REDDIT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Instagram Provider
if (process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET) {
  providers.push(
    Instagram({
      clientId: process.env.AUTH_INSTAGRAM_ID,
      clientSecret: process.env.AUTH_INSTAGRAM_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Facebook Provider
if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  providers.push(
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// TikTok Provider
if (process.env.AUTH_TIKTOK_ID && process.env.AUTH_TIKTOK_SECRET) {
  providers.push(
    TikTok({
      clientId: process.env.AUTH_TIKTOK_ID,
      clientSecret: process.env.AUTH_TIKTOK_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Nodemailer provider for magic links
if (process.env.EMAIL_SERVER_HOST) {
  providers.push(
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587"),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { host } = new URL(url);
        const transport = createTransport(provider.server);
        
        const { subject, html, text } = createMagicLinkEmailTemplate({
          url,
          host,
          email,
        });        try {
          await transport.sendMail({
            to: email,
            from: provider.from,
            subject,
            text,
            html,          });
        } catch (error) {
          // Safely extract server configuration for logging
          const serverConfig = provider.server as {
            host?: string;
            port?: number;
          };
          const smtpHost = typeof serverConfig === 'object' && serverConfig?.host 
            ? String(serverConfig.host) 
            : 'unknown';
          const smtpPort = typeof serverConfig === 'object' && serverConfig?.port 
            ? String(serverConfig.port) 
            : 'unknown';
            
          logger.error({
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            to: email,
            subject,
            smtpHost,
            smtpPort,
            fromAddress: provider.from,
            operation: 'send_verification_email',
            actionNeeded: 'Check SMTP configuration and email provider credentials'
          }, `Failed to send verification email to ${email}: ${error instanceof Error ? error.message : String(error)}`);
          throw new Error("Failed to send verification email");
        }
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  pages: {
    verifyRequest: "/auth/verify-request", // Custom verify-request page
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60, // 10 minutes
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60, // 1 hour
      },
    },
  },
  callbacks: {
    session: async ({ session, user }) => {
      const { id } = user;
      // We can safely access these fields since we've augmented the User type
      const { adminLevel, adminScope } = user;

      return {
        ...session,
        user: {
          ...session.user,
          id,
          adminLevel,
          adminScope,
        },
      };
    },
  },
  debug: process.env.NODE_ENV === "development",
});

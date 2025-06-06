import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Twitch from "next-auth/providers/twitch";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Reddit from "next-auth/providers/reddit";
import Instagram from "next-auth/providers/instagram";
import Facebook from "next-auth/providers/facebook";
import TikTok from "next-auth/providers/tiktok";
import Email from "next-auth/providers/email";
import { type DefaultSession } from "next-auth";
import { db } from "~/server/db";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
      ? [
          Discord({
            clientId: process.env.AUTH_DISCORD_ID,
            clientSecret: process.env.AUTH_DISCORD_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET
      ? [
          Twitch({
            clientId: process.env.AUTH_TWITCH_ID,
            clientSecret: process.env.AUTH_TWITCH_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_REDDIT_ID && process.env.AUTH_REDDIT_SECRET
      ? [
          Reddit({
            clientId: process.env.AUTH_REDDIT_ID,
            clientSecret: process.env.AUTH_REDDIT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET
      ? [
        Instagram({
        clientId: process.env.AUTH_INSTAGRAM_ID,
        clientSecret: process.env.AUTH_INSTAGRAM_SECRET,
        allowDangerousEmailAccountLinking: true,
        }),
      ]
      : []),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [
        Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET,
        allowDangerousEmailAccountLinking: true,
        }),
      ]
      : []),    ...(process.env.AUTH_TIKTOK_ID && process.env.AUTH_TIKTOK_SECRET
      ? [
        TikTok({
        clientId: process.env.AUTH_TIKTOK_ID,
        clientSecret: process.env.AUTH_TIKTOK_SECRET,
        allowDangerousEmailAccountLinking: true,
        }),
      ]
      : []),
    // Email provider for magic links
    ...(process.env.EMAIL_SERVER_HOST
      ? [
          Email({
            server: {
              host: process.env.EMAIL_SERVER_HOST,
              port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587"),
              auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
              },
            },
            from: process.env.EMAIL_FROM,
          }),
        ]
      : []),
  ],
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

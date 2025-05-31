import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Twitch from "next-auth/providers/twitch";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
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
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true, // Trust localhost during development
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
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
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // Add adminLevel and adminScope to session.user if present
      const { id, adminLevel, adminScope } = user as {
        id: string;
        adminLevel?: "USER" | "DEPARTMENT" | "DOMAIN" | "SITE";
        adminScope?: string | null;
      };
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

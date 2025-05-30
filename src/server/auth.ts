import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"
import Twitch from "next-auth/providers/twitch"
import Google from "next-auth/providers/google"
import { type DefaultSession } from "next-auth"
import { db } from "~/server/db"
import LoopsProvider from "next-auth/providers/loops"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
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
    // Only use LoopsProvider for magic link login
    LoopsProvider({
      apiKey: process.env.AUTH_LOOPS_KEY!,
      transactionalId: process.env.AUTH_LOOPS_TRANSACTIONAL_ID!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    session: ({ session, user }: { session: any; user: any }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  debug: process.env.NODE_ENV === "development",
});

import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"
import Twitch from "next-auth/providers/twitch"
import { type DefaultSession } from "next-auth"
import { db } from "~/server/db"

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
    }),
    ...(process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET
      ? [
          Twitch({
            clientId: process.env.AUTH_TWITCH_ID,
            clientSecret: process.env.AUTH_TWITCH_SECRET,
          }),
        ]
      : []),
  ],  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  debug: process.env.NODE_ENV === "development",
})

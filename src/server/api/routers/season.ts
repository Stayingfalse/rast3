import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { amazonWishlistRegex, WISHLIST_HINT } from "~/lib/wishlist";
import {
  checkIn,
  currentSeason,
  hasCheckedIn,
  seasonWindow,
} from "~/server/season";

/** Day 18: this season's dates and your yearly check-in. */
export const seasonRouter = createTRPCRouter({
  status: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const season = currentSeason();
    const [w, done, me, groups] = await Promise.all([
      seasonWindow(ctx.db, season),
      hasCheckedIn(ctx.db, userId, season),
      ctx.db.user.findUnique({
        where: { id: userId },
        select: { amazonWishlistUrl: true, profileCompleted: true },
      }),
      ctx.db.membership.findMany({
        where: { userId, group: { kind: { not: "TEAM" } } },
        select: {
          group: { select: { id: true, name: true, kind: true, openEarly: true } },
        },
      }),
    ]);
    const now = new Date();
    const inWindow = now >= w.opensAt && now <= w.closesAt;
    return {
      season,
      opensAt: w.opensAt,
      closesAt: w.closesAt,
      phase: now < w.opensAt ? ("before" as const) : inWindow ? ("open" as const) : ("after" as const),
      /** can you pick up anywhere right now (the season, or a group opened early) */
      openNow: inWindow || groups.some((m) => m.group.openEarly),
      checkedIn: done,
      profileCompleted: !!me?.profileCompleted,
      wishlistUrl: me?.amazonWishlistUrl ?? null,
      groups: groups.map(({ group: { openEarly: _o, ...g } }) => g),
    };
  }),

  /** Confirm (or replace) your wishlist for this season and check in. */
  checkIn: protectedProcedure
    .input(
      z.object({
        amazonWishlistUrl: z
          .string()
          .trim()
          .regex(amazonWishlistRegex, WISHLIST_HINT)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.amazonWishlistUrl) {
        await ctx.db.user.update({
          where: { id: userId },
          data: { amazonWishlistUrl: input.amazonWishlistUrl },
        });
      } else {
        const me = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { amazonWishlistUrl: true },
        });
        if (!me?.amazonWishlistUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Add your wishlist link to check in.",
          });
        }
      }
      await checkIn(ctx.db, userId);
      return { season: currentSeason() };
    }),
});

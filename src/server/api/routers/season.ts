import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { lastOrderNotice } from "~/lib/last-order";
import { amazonWishlistRegex, cleanWishlistUrl, WISHLIST_HINT } from "~/lib/wishlist";
import {
  checkIn,
  currentSeason,
  hasCheckedIn,
  seasonWindow,
} from "~/server/season";
import { launchOf, launchSelect } from "~/server/group-launch";

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
          group: { select: { id: true, name: true, ...launchSelect } },
        },
      }),
    ]);
    const now = new Date();
    const mine = groups.map(({ group: { launchAt: _a, launchSeason: _s, parent: _p, ...g } }, i) => {
      const opensAt = launchOf(groups[i]!.group, w);
      return { ...g, opensAt, open: now >= opensAt && now <= w.closesAt };
    });
    // with no groups yet, the season's own dates
    const openNow = mine.length ? mine.some((g) => g.open) : now >= w.opensAt && now <= w.closesAt;
    // when gifting next opens for you: your earliest group still to open
    const next = mine
      .filter((g) => !g.open && g.opensAt > now)
      .reduce<Date | null>((a, g) => (!a || g.opensAt < a ? g.opensAt : a), null);
    return {
      season,
      /** when gifting opens for you (your first group to open), or the season's date */
      opensAt: openNow ? w.opensAt : (next ?? w.opensAt),
      siteOpensAt: w.opensAt,
      closesAt: w.closesAt,
      phase: now > w.closesAt ? ("after" as const) : openNow ? ("open" as const) : ("before" as const),
      /** can you pick up anywhere right now (in at least one of your groups) */
      openNow,
      /**
       * The last-order countdown (6 Nov), worked out here so the server
       * render and the browser show the same words
       */
      lastOrder: lastOrderNotice({ now, lastOrderAt: w.lastOrderAt, giftingOpen: openNow }),
      checkedIn: done,
      profileCompleted: !!me?.profileCompleted,
      wishlistUrl: me?.amazonWishlistUrl ?? null,
      groups: mine,
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
          data: { amazonWishlistUrl: cleanWishlistUrl(input.amazonWishlistUrl) },
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

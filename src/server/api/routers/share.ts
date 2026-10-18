import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { newShareCode, sharePath } from "~/server/share-cards";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const shareRouter = createTRPCRouter({
  /**
   * Returns the share link for one of your own gifts or thank-yous, creating
   * it the first time. Only the giver can share a gift, and only the poster
   * can share a thank-you.
   */
  create: protectedProcedure
    .input(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("sent"), purchaseId: z.string() }),
        z.object({ kind: z.literal("thanks"), kudosId: z.string() }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (input.kind === "sent") {
        const purchase = await ctx.db.purchase.findFirst({
          where: { id: input.purchaseId, userId },
          select: { id: true, shareCard: { select: { id: true } } },
        });
        if (!purchase) throw new TRPCError({ code: "NOT_FOUND" });
        const code =
          purchase.shareCard?.id ??
          (
            await ctx.db.shareCard.create({
              data: {
                id: newShareCode(),
                kind: "SENT",
                userId,
                purchaseId: purchase.id,
              },
            })
          ).id;
        return { code, path: sharePath("sent", code) };
      }

      const kudos = await ctx.db.kudos.findFirst({
        where: { id: input.kudosId, userId, hidden: false },
        select: { id: true, shareCard: { select: { id: true } } },
      });
      if (!kudos) throw new TRPCError({ code: "NOT_FOUND" });
      const code =
        kudos.shareCard?.id ??
        (
          await ctx.db.shareCard.create({
            data: {
              id: newShareCode(),
              kind: "THANKS",
              userId,
              kudosId: kudos.id,
            },
          })
        ).id;
      return { code, path: sharePath("thanks", code) };
    }),
});

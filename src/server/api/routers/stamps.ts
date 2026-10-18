import { buildAlbum } from "~/server/stamps";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const stampsRouter = createTRPCRouter({
  /** The signed-in member's own album. Never exposes anyone else's activity. */
  getMyAlbum: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [purchases, kudos] = await Promise.all([
      ctx.db.purchase.findMany({
        where: { userId },
        select: { purchasedAt: true },
      }),
      ctx.db.kudos.findMany({
        where: { userId, hidden: false },
        select: { createdAt: true },
      }),
    ]);
    return buildAlbum(
      purchases.map((p) => p.purchasedAt),
      kudos.map((k) => k.createdAt),
    );
  }),
});

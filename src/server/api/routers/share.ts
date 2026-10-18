import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { db as Db } from "~/server/db";
import {
  groupKeyOf,
  groupTotals,
  newShareCode,
  sharePath,
  type GroupScope,
} from "~/server/share-cards";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * The groups this member may share a total for, with their default card
 * names. Organisers only: site admins, the organisation's domain admin, or
 * the department's admin. Always the member's own organisation and team.
 */
async function shareableGroups(db: typeof Db, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      adminLevel: true,
      adminScope: true,
      domain: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });
  if (!user) return [];
  const groups: { scope: GroupScope; id: string; label: string }[] = [];
  const site = user.adminLevel === "SITE";
  const domainAdmin =
    user.adminLevel === "DOMAIN" &&
    !!user.domain &&
    user.adminScope === user.domain;
  const deptAdmin =
    user.adminLevel === "DEPARTMENT" &&
    !!user.departmentId &&
    user.adminScope === user.departmentId;

  if (user.domain && (site || domainAdmin)) {
    const domain = await db.domain.findUnique({
      where: { name: user.domain },
      select: { description: true },
    });
    const described = domain?.description?.trim();
    groups.push({
      scope: "org",
      id: user.domain,
      label: described && described.length <= 40 ? described : user.domain,
    });
  }
  if (
    user.departmentId &&
    user.department &&
    (site || domainAdmin || deptAdmin)
  ) {
    groups.push({
      scope: "team",
      id: user.departmentId,
      label: user.department.name,
    });
  }
  return groups;
}

export const shareRouter = createTRPCRouter({
  /** Organisers: this season's rounded totals for the groups they can share. */
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    const groups = await shareableGroups(ctx.db, ctx.session.user.id);
    return Promise.all(
      groups.map(async (g) => {
        const card = await ctx.db.shareCard.findUnique({
          where: { groupKey: groupKeyOf(g.scope, g.id) },
          select: { label: true },
        });
        return groupTotals(g.scope, g.id, card?.label ?? g.label);
      }),
    );
  }),

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
        z.object({
          kind: z.literal("team"),
          scope: z.enum(["org", "team"]),
          label: z.string().trim().min(1).max(40),
        }),
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

      if (input.kind === "team") {
        const group = (await shareableGroups(ctx.db, userId)).find(
          (g) => g.scope === input.scope,
        );
        if (!group) throw new TRPCError({ code: "FORBIDDEN" });
        const totals = await groupTotals(group.scope, group.id, input.label);
        if (!totals.gifts) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Share the total once your group has sent 10 or more gifts.",
          });
        }
        const groupKey = groupKeyOf(group.scope, group.id);
        const card = await ctx.db.shareCard.upsert({
          where: { groupKey },
          update: { label: input.label },
          create: {
            id: newShareCode(),
            kind: group.scope === "org" ? "ORG" : "TEAM",
            userId,
            groupKey,
            label: input.label,
          },
        });
        return { code: card.id, path: sharePath("team", card.id) };
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

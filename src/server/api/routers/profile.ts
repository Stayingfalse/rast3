import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cantDelete, deleteAccount } from "~/server/account";
import { getWorkplace } from "~/server/groups";
import { checkIn } from "~/server/season";

import { amazonWishlistRegex, cleanWishlistUrl, WISHLIST_HINT } from "~/lib/wishlist";

// Helper function to normalize wishlist URL
const normalizeWishlistUrl = (url: string | undefined): string | null => {
  if (!url || url.trim() === "") return null;
  return cleanWishlistUrl(url);
};

export const profileRouter = createTRPCRouter({
  /** Your profile, plus your workplace and team (from memberships). */
  getCurrentProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });
    if (!user) return null;

    // Organisation status comes from its group (Day 11): PENDING ones wait
    // for a site admin; only ACTIVE ones are open for gifting.
    const { org, team } = await getWorkplace(ctx.db, user.id);
    return {
      ...user,
      workplace: org
        ? {
            id: org.group.id,
            name: org.group.name,
            status: org.group.status,
            team: team ? { id: team.group.id, name: team.group.name } : null,
          }
        : null,
      orgStatus: org?.group.status ?? null,
    };
  }),

  // Check if a domain is enabled
  checkDomainStatus: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.group.findUnique({
        where: { emailDomain: input.domain.trim().toLowerCase() },
        select: { status: true, joinCode: true },
      });

      return {
        exists: !!org,
        // can people join it (pending ones too, gifting waits for approval)
        enabled: !!org && org.status !== "DISABLED",
        pending: org?.status === "PENDING",
        codeRequired: !!org?.joinCode,
      };
    }),
  /**
   * Day 12: your profile is just you and your wishlist. Joining or starting
   * an organisation or group is a separate step (groups router).
   */
  saveProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().trim().min(1, "First name is required").max(60),
        lastName: z.string().trim().min(1, "Last name is required").max(60),
        amazonWishlistUrl: z
          .string()
          .optional()
          .transform((val) => normalizeWishlistUrl(val))
          .refine(
            (url) => url === null || amazonWishlistRegex.test(url),
            WISHLIST_HINT,
          ),
        /** reminder emails (22 Oct); left out = unchanged */
        emailReminders: z.boolean().optional(),
        /** "I'm 16 or over" (Day 30): needed for a first profile */
        over16: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { profileCompleted: true, profileCompletedAt: true, ageConfirmedAt: true },
      });
      if (!current?.profileCompleted && !current?.ageConfirmedAt && !input.over16) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please confirm you're 16 or over: Random Acts of Santa is for adults.",
        });
      }
      // A new member's first profile, with their wishlist, is their check-in
      // for this season (Day 18); returning members check in separately
      // (season.checkIn), and so does anyone who adds their wishlist later
      if (!current?.profileCompleted && input.amazonWishlistUrl) {
        await checkIn(ctx.db, ctx.session.user.id);
      }
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          amazonWishlistUrl: input.amazonWishlistUrl,
          emailReminders: input.emailReminders,
          profileCompleted: true,
          profileCompletedAt: current?.profileCompletedAt ?? new Date(),
          ageConfirmedAt: current?.ageConfirmedAt ?? (input.over16 ? new Date() : undefined),
        },
        select: { id: true, profileCompleted: true },
      });
    }),

  /**
   * Day 30: delete your own account and everything that's yours. You type
   * "delete" to confirm. Site admins hand over their admin access first.
   */
  deleteAccount: protectedProcedure
    .input(z.object({ confirm: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.confirm.trim().toLowerCase() !== "delete") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Type delete to confirm" });
      }
      const reason = await cantDelete(ctx.db, ctx.session.user.id);
      if (reason) throw new TRPCError({ code: "FORBIDDEN", message: reason });
      await deleteAccount(ctx.db, ctx.session.user.id);
      return { ok: true };
    }),
});

// Ensure this file is recognized as a module
export {};

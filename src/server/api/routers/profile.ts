import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getWorkplace } from "~/server/groups";

// Amazon UK wishlist URL regex
const amazonWishlistRegex =
  /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:\?.*)?$/i;

// Helper function to normalize wishlist URL
const normalizeWishlistUrl = (url: string | undefined): string | null => {
  if (!url || url.trim() === "") return null;
  return url.trim();
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
            "Must be a valid Amazon UK wishlist URL (e.g., https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX)",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { profileCompletedAt: true },
      });
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          amazonWishlistUrl: input.amazonWishlistUrl,
          profileCompleted: true,
          profileCompletedAt: current?.profileCompletedAt ?? new Date(),
        },
        select: { id: true, profileCompleted: true },
      });
    }),
});

// Ensure this file is recognized as a module
export {};

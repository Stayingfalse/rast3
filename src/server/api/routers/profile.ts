import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { ensureTeamGroup } from "~/server/groups";
import { canManageDomain } from "~/server/utils/admin-permissions";

type UserWithDepartment = {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  amazonWishlistUrl?: string | null;
  wishlistViews: number;
  departmentId?: string | null;
  domain?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileCompleted: boolean;
  profileCompletedAt?: Date | null;
  workEmail?: string | null;
  adminLevel: string;
  adminScope?: string | null;
  department?: {
    id: string;
    name: string;
    domain: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

// Amazon UK wishlist URL regex
const amazonWishlistRegex =
  /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:\?.*)?$/i;

// Helper function to normalize wishlist URL
const normalizeWishlistUrl = (url: string | undefined): string | null => {
  if (!url || url.trim() === "") return null;
  return url.trim();
};

export const profileRouter = createTRPCRouter({
  // Get current user's profile with domain status
  getCurrentProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = (await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        department: true,
      },
    })) as UserWithDepartment | null;

    if (!user) return null;

    // Organisation status comes from its group (Day 11): PENDING ones wait
    // for a site admin; only ACTIVE ones are open for gifting.
    const org = user.domain
      ? await ctx.db.group.findUnique({
          where: { emailDomain: user.domain.trim().toLowerCase() },
          select: { status: true },
        })
      : null;
    const domainEnabled =
      org?.status === "ACTIVE" ? true : org?.status === "DISABLED" ? false : null;

    return {
      ...user,
      domainEnabled,
      orgStatus: org?.status ?? null,
      adminLevel: user.adminLevel,
      adminScope: user.adminScope,
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
  // Get departments for a domain
  getDepartmentsByDomain: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get current user to check admin level and scope
      const currentUser = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          adminLevel: true,
          adminScope: true,
          domain: true,
          departmentId: true,
        },
      });

      if (!currentUser) {
        throw new Error("User not found");
      }

      // Build where clause based on admin level
      const where: Record<string, unknown> = {};

      if (currentUser.adminLevel === "DOMAIN") {
        // Domain admins see only departments in their domain
        if (currentUser.adminScope) {
          where.domain = currentUser.adminScope;
        }
      } else if (currentUser.adminLevel === "DEPARTMENT") {
        // Department admins see only their own department
        if (currentUser.adminScope) {
          where.id = currentUser.adminScope;
        }
      } else if (currentUser.adminLevel === "SITE") {
        // Site admins can see all departments or filter by domain
        if (input.domain !== "all") {
          where.domain = input.domain;
        }
      } else {
        // Members choosing a department during setup: one organisation only
        if (input.domain === "all") return [];
        where.domain = input.domain;
      }

      return ctx.db.department.findMany({
        where,
        orderBy: [{ domain: "asc" }, { name: "asc" }],
      });
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

  // Admin: Create department
  createDepartment: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Department name is required").max(100),
        domain: z.string().min(1, "Domain is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = input.domain.toLowerCase();
      if (!(await canManageDomain(ctx.admin, domain))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your organisation",
        });
      }
      const department = await ctx.db.department.create({
        data: { name: input.name, domain },
      });
      await ensureTeamGroup(ctx.db, department.id);
      return department;
    }),
});

// Ensure this file is recognized as a module
export {};

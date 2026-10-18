import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  rateLimit,
} from "~/server/api/trpc";
import {
  ensureOrgGroup,
  ensureTeamGroup,
  syncUserGroups,
} from "~/server/groups";
import { normaliseJoinCode } from "~/server/invites";
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

/**
 * Day 11: joining an organisation is on trust (no email verification), with
 * two safeguards: closed organisations can't be joined, and an organisation
 * with a join code needs it from anyone who isn't already a member.
 */
async function checkOrgEntry(
  db: Pick<PrismaClient, "group" | "membership">,
  userId: string,
  domain: string,
  joinCode: string | undefined,
) {
  const org = await db.group.findUnique({
    where: { emailDomain: domain.trim().toLowerCase() },
    select: { id: true, status: true, joinCode: true },
  });
  if (!org) return;
  if (org.status === "DISABLED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Your organisation is closed on Random Acts of Santa. Ask your organiser.",
    });
  }
  if (!org.joinCode) return;
  const member = await db.membership.findUnique({
    where: { groupId_userId: { groupId: org.id, userId } },
    select: { id: true },
  });
  if (!member && normaliseJoinCode(joinCode ?? "") !== org.joinCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Your organisation needs a join code. Ask your organiser for it.",
    });
  }
}

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
  // Complete profile setup
  completeProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        workEmail: z.string().email("Valid work email is required"),
        departmentId: z.string().optional(),
        /** Required when the organisation has a join code (Day 11) */
        joinCode: z.string().max(200).optional(),
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
      const {
        firstName,
        lastName,
        workEmail,
        departmentId,
        amazonWishlistUrl,
      } = input;

      // Extract domain from work email
      const domain = workEmail.split("@")[1];

      if (domain) {
        await checkOrgEntry(ctx.db, ctx.session.user.id, domain, input.joinCode);
      }

      // Check if another user already has this work email
      const existingUser = await ctx.db.user.findUnique({
        where: { workEmail },
      });

      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error(
          "This work email is already registered by another user",
        );
      }

      // Validate departmentId if provided
      let validDepartmentId: string | null = null;
      if (departmentId) {
        const department = await ctx.db.department.findUnique({
          where: { id: departmentId },
        });

        if (!department) {
          throw new Error("Selected department does not exist");
        }

        if (department.domain !== domain) {
          throw new Error(
            "Selected department does not belong to your organization",
          );
        }

        validDepartmentId = departmentId;
      }

      const synced = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName,
          lastName,
          workEmail,
          domain,
          departmentId: validDepartmentId,
          amazonWishlistUrl,
          profileCompleted: true,
          profileCompletedAt: new Date(),
        },
        include: {
          department: true,
        },
      });
      await syncUserGroups(ctx.db, ctx.session.user.id);
      return synced;
    }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        workEmail: z.string().email("Valid work email is required"),
        departmentId: z.string().optional(),
        /** Required when the organisation has a join code (Day 11) */
        joinCode: z.string().max(200).optional(),
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
      const {
        firstName,
        lastName,
        workEmail,
        departmentId,
        amazonWishlistUrl,
      } = input;

      // Extract domain from work email
      const domain = workEmail.split("@")[1];

      if (domain) {
        await checkOrgEntry(ctx.db, ctx.session.user.id, domain, input.joinCode);
      }

      // Check if another user already has this work email
      const existingUser = await ctx.db.user.findUnique({
        where: { workEmail },
      });

      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error(
          "This work email is already registered by another user",
        );
      }

      // Validate departmentId if provided
      let validDepartmentId: string | null = null;
      if (departmentId) {
        const department = await ctx.db.department.findUnique({
          where: { id: departmentId },
        });

        if (!department) {
          throw new Error("Selected department does not exist");
        }

        if (department.domain !== domain) {
          throw new Error(
            "Selected department does not belong to your organization",
          );
        }

        validDepartmentId = departmentId;
      }

      const synced = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName,
          lastName,
          workEmail,
          domain,
          departmentId: validDepartmentId,
          amazonWishlistUrl,
        },
        include: {
          department: true,
        },
      });
      await syncUserGroups(ctx.db, ctx.session.user.id);
      return synced;
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
  // Setup new domain and complete profile (for new domains)
  setupNewDomain: protectedProcedure
    .use(rateLimit("setupNewDomain", 5, 60 * 60_000))
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        workEmail: z.string().email("Valid work email is required"),
        departmentId: z.string().optional(),
        /** Required when the organisation has a join code (Day 11) */
        joinCode: z.string().max(200).optional(),
        amazonWishlistUrl: z
          .string()
          .optional()
          .transform((val) => normalizeWishlistUrl(val))
          .refine(
            (url) => url === null || amazonWishlistRegex.test(url),
            "Must be a valid Amazon UK wishlist URL (e.g., https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX)",
          ),
        domainDescription: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        firstName,
        lastName,
        workEmail,
        departmentId,
        amazonWishlistUrl,
        domainDescription,
      } = input;

      // Extract domain from work email
      const domain = workEmail.split("@")[1];
      if (!domain) {
        throw new Error("Invalid email domain");
      }

      // Check if domain already exists
      const existingDomain = await ctx.db.domain.findUnique({
        where: { name: domain },
      });

      if (existingDomain) {
        throw new Error(
          "Domain already exists. Please contact your domain administrator.",
        );
      }

      // Check if another user already has this work email
      const existingUser = await ctx.db.user.findUnique({
        where: { workEmail },
      });

      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error(
          "This work email is already registered by another user",
        );
      }

      // Create domain
      const newDomain = await ctx.db.domain.create({
        data: {
          name: domain,
          description: domainDescription,
          enabled: false, // goes live when a site admin approves it (owner, 18 Oct)
          createdById: ctx.session.user.id,
        },
      });

      // Validate departmentId if provided
      let validDepartmentId: string | null = null;
      if (departmentId) {
        const department = await ctx.db.department.findUnique({
          where: { id: departmentId },
        });

        if (!department) {
          throw new Error("Selected department does not exist");
        }

        if (department.domain !== domain) {
          throw new Error(
            "Selected department does not belong to your organization",
          );
        }

        validDepartmentId = departmentId;
      }

      // Update user profile and make them domain admin
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName,
          lastName,
          workEmail,
          domain,
          departmentId: validDepartmentId,
          amazonWishlistUrl,
          profileCompleted: true,
          profileCompletedAt: new Date(),
          adminLevel: "DOMAIN",
          adminScope: domain,
        },
        include: {
          department: true,
        },
      });

      // New organisations wait for a site admin's approval while it's free
      const org = await ensureOrgGroup(ctx.db, domain);
      if (org) {
        await ctx.db.group.update({
          where: { id: org.id },
          data: { status: "PENDING", createdById: ctx.session.user.id },
        });
      }
      await syncUserGroups(ctx.db, ctx.session.user.id);

      return { user: updatedUser, domain: newDomain };
    }),
});

// Ensure this file is recognized as a module
export {};

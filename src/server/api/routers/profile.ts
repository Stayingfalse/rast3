import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Amazon UK wishlist URL regex
const amazonWishlistRegex =   /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:\?.*)?$/i;

export const profileRouter = createTRPCRouter({
  // Get current user's profile with domain status
  getCurrentProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await (ctx.db as any).user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        department: true,
      },
    });

    if (!user) return null;

    // Get domain status if user has a domain
    let domainEnabled = null;
    if (user.domain) {
      const domain = await (ctx.db as any).domain.findUnique({
        where: { name: user.domain },
        select: { enabled: true },
      });
      domainEnabled = domain?.enabled ?? false;
    }

    return {
      ...user,
      domainEnabled,
      adminLevel: user.adminLevel,
      adminScope: user.adminScope,
    };
  }),

  // Check if a domain is enabled
  checkDomainStatus: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ ctx, input }) => {
      const domain = await (ctx.db as any).domain.findUnique({
        where: { name: input.domain },
        select: { enabled: true },
      });
      
      return {
        exists: !!domain,
        enabled: domain?.enabled ?? false,
      };
    }),

  // Get departments for a domain
  getDepartmentsByDomain: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(({ ctx, input }) => {
      // If domain is "all", return all departments
      if (input.domain === "all") {
        return (ctx.db as any).department.findMany({
          orderBy: [{ domain: "asc" }, { name: "asc" }],
        });
      }
      
      return (ctx.db as any).department.findMany({
        where: { domain: input.domain },
        orderBy: { name: "asc" },
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
        amazonWishlistUrl: z
          .string()
          .optional()
          .refine(
            (url) => !url || amazonWishlistRegex.test(url),
            "Must be a valid Amazon UK wishlist URL (e.g., https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX)"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { firstName, lastName, workEmail, departmentId, amazonWishlistUrl } = input;
      
      // Extract domain from work email
      const domain = workEmail.split("@")[1];
      
      // Check if domain exists and is enabled
      if (domain) {
        const domainRecord = await (ctx.db as any).domain.findUnique({
          where: { name: domain },
          select: { enabled: true },
        });
        
        if (domainRecord && !domainRecord.enabled) {
          throw new Error("Your organization's domain is currently disabled. Please contact your manager for access.");
        }
      }
      
      // Check if another user already has this work email
      const existingUser = await (ctx.db as any).user.findUnique({
        where: { workEmail },
      });
      
      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error("This work email is already registered by another user");
      }

      return (ctx.db as any).user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName,
          lastName,
          workEmail,
          domain,
          departmentId,
          amazonWishlistUrl,
          profileCompleted: true,
          profileCompletedAt: new Date(),
        },
        include: {
          department: true,
        },
      });
    }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        workEmail: z.string().email("Valid work email is required"),
        departmentId: z.string().optional(),
        amazonWishlistUrl: z
          .string()
          .optional()
          .refine(
            (url) => !url || amazonWishlistRegex.test(url),
            "Must be a valid Amazon UK wishlist URL (e.g., https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX)"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { firstName, lastName, workEmail, departmentId, amazonWishlistUrl } = input;
      
      // Extract domain from work email
      const domain = workEmail.split("@")[1];
      
      // Check if domain exists and is enabled
      if (domain) {
        const domainRecord = await (ctx.db as any).domain.findUnique({
          where: { name: domain },
          select: { enabled: true },
        });
        
        if (domainRecord && !domainRecord.enabled) {
          throw new Error("Your organization's domain is currently disabled. Please contact your manager for access.");
        }
      }
      
      // Check if another user already has this work email
      const existingUser = await (ctx.db as any).user.findUnique({
        where: { workEmail },
      });
      
      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error("This work email is already registered by another user");
      }

      return (ctx.db as any).user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName,
          lastName,
          workEmail,
          domain,
          departmentId,
          amazonWishlistUrl,
        },
        include: {
          department: true,
        },
      });
    }),

  // Admin: Create department
  createDepartment: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Department name is required"),
        domain: z.string().min(1, "Domain is required"),
      })
    )
    .mutation(({ ctx, input }) => {
      return (ctx.db as any).department.create({
        data: input,
      });
    }),
});

// Ensure this file is recognized as a module
export {};

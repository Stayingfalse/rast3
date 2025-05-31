import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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

type DomainStatus = {
  enabled: boolean;
};

// Amazon UK wishlist URL regex
const amazonWishlistRegex =   /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:\?.*)?$/i;

// Helper function to normalize wishlist URL
const normalizeWishlistUrl = (url: string | undefined): string | null => {
  if (!url || url.trim() === "") return null;
  return url.trim();
};

export const profileRouter = createTRPCRouter({
  // Get current user's profile with domain status
  getCurrentProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        department: true,
      },
    }) as UserWithDepartment | null;

    if (!user) return null;

    // Get domain status if user has a domain
    let domainEnabled = null;
    if (user.domain) {
      const domain = await ctx.db.domain.findUnique({
        where: { name: user.domain },
        select: { enabled: true },
      }) as DomainStatus | null;
      domainEnabled = domain?.enabled ?? false;    }

    return {
      ...user,
      domainEnabled,
      adminLevel: user.adminLevel,
      adminScope: user.adminScope,
    };
  }),

  // Check if a domain is enabled
  checkDomainStatus: protectedProcedure
    .input(z.object({ domain: z.string() }))    .query(async ({ ctx, input }) => {
      const domain = await ctx.db.domain.findUnique({
        where: { name: input.domain },
        select: { enabled: true },
      }) as DomainStatus | null;
      
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
      if (input.domain === "all") {      return ctx.db.department.findMany({
        orderBy: [{ domain: "asc" }, { name: "asc" }],
      });
      }      
      return ctx.db.department.findMany({
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
          .transform((val) => normalizeWishlistUrl(val))
          .refine(
            (url) => url === null || amazonWishlistRegex.test(url),
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
        const domainRecord = await ctx.db.domain.findUnique({
          where: { name: domain },
          select: { enabled: true },
        }) as DomainStatus | null;
        
        if (domainRecord && !domainRecord.enabled) {
          throw new Error("Your organization's domain is currently disabled. Please contact your manager for access.");
        }
      }
      
      // Check if another user already has this work email
      const existingUser = await ctx.db.user.findUnique({
        where: { workEmail },
      });
      
      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error("This work email is already registered by another user");
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
          throw new Error("Selected department does not belong to your organization");
        }
        
        validDepartmentId = departmentId;
      }

      return ctx.db.user.update({
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
          .transform((val) => normalizeWishlistUrl(val))
          .refine(
            (url) => url === null || amazonWishlistRegex.test(url),
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
        const domainRecord = await ctx.db.domain.findUnique({
          where: { name: domain },
          select: { enabled: true },
        }) as DomainStatus | null;
        
        if (domainRecord && !domainRecord.enabled) {
          throw new Error("Your organization's domain is currently disabled. Please contact your manager for access.");
        }
      }
      
      // Check if another user already has this work email
      const existingUser = await ctx.db.user.findUnique({
        where: { workEmail },
      });
      
      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error("This work email is already registered by another user");
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
          throw new Error("Selected department does not belong to your organization");
        }
        
        validDepartmentId = departmentId;
      }

      return ctx.db.user.update({
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
    }),

  // Admin: Create department
  createDepartment: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Department name is required"),
        domain: z.string().min(1, "Domain is required"),
      })
    )    .mutation(({ ctx, input }) => {
      return ctx.db.department.create({
        data: input,
      });
    }),
  // Setup new domain and complete profile (for new domains)
  setupNewDomain: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        workEmail: z.string().email("Valid work email is required"),
        departmentId: z.string().optional(),
        amazonWishlistUrl: z
          .string()
          .optional()
          .transform((val) => normalizeWishlistUrl(val))
          .refine(
            (url) => url === null || amazonWishlistRegex.test(url),
            "Must be a valid Amazon UK wishlist URL (e.g., https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX)"
          ),
        domainDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { firstName, lastName, workEmail, departmentId, amazonWishlistUrl, domainDescription } = input;
      
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
        throw new Error("Domain already exists. Please contact your domain administrator.");
      }
      
      // Check if another user already has this work email
      const existingUser = await ctx.db.user.findUnique({
        where: { workEmail },
      });
      
      if (existingUser && existingUser.id !== ctx.session.user.id) {
        throw new Error("This work email is already registered by another user");
      }

      // Create domain
      const newDomain = await ctx.db.domain.create({
        data: {
          name: domain,
          description: domainDescription,
          enabled: true,
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
          throw new Error("Selected department does not belong to your organization");
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

      return { user: updatedUser, domain: newDomain };
    }),
});

// Ensure this file is recognized as a module
export {};

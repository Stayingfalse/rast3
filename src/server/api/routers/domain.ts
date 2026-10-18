import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  siteAdminProcedure,
} from "~/server/api/trpc";
import { syncOrgGroupStatus } from "~/server/groups";
import { canManageDomain } from "~/server/utils/admin-permissions";

const forbidden = () =>
  new TRPCError({ code: "FORBIDDEN", message: "Not your organisation" });

export const domainRouter = createTRPCRouter({
  // Get all domains
  getAll: adminProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.admin;

    let where = {};
    if (currentUser.adminLevel === "DOMAIN") {
      where = { name: currentUser.adminScope };
    } else if (currentUser.adminLevel === "DEPARTMENT") {
      // Find department to get domain
      const dept = await ctx.db.department.findUnique({
        where: { id: currentUser.adminScope ?? "" },
      });
      if (dept) {
        where = { name: dept.domain };
      } else {
        return [];
      }
    }
    // SITE gets all, USER should never reach here

    const domains = await ctx.db.domain.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }); // Get department counts for each domain manually
    const domainsWithCounts = await Promise.all(
      domains.map(async (domain) => {
        const departmentCount = await ctx.db.department.count({
          where: { domain: domain.name },
        });
        return {
          ...domain,
          _count: {
            departments: departmentCount,
          },
        };
      }),
    );

    return domainsWithCounts;
  }),
  // Create domain (site admins; organisers set theirs up via profile setup)
  create: siteAdminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Domain name is required"),
        description: z.string().optional(),
        enabled: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = await ctx.db.domain.create({
        data: {
          name: input.name.toLowerCase(),
          description: input.description,
          enabled: input.enabled,
          createdById: ctx.session.user.id,
        },
      });
      await syncOrgGroupStatus(ctx.db, domain.name);
      return domain;
    }),

  // Update domain
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Domain name is required").optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const existing = await ctx.db.domain.findUnique({ where: { id } });
      if (!existing || !canManageDomain(ctx.admin, existing.name)) {
        throw forbidden();
      }
      // Organisers' admin scope is the domain name, so only site admins rename
      if (
        updateData.name &&
        updateData.name.toLowerCase() !== existing.name &&
        ctx.admin.adminLevel !== "SITE"
      ) {
        throw forbidden();
      }

      // If name is being updated, ensure it's lowercase
      if (updateData.name) {
        updateData.name = updateData.name.toLowerCase();
      }
      const updated = await ctx.db.domain.update({
        where: { id },
        data: updateData,
      });
      await syncOrgGroupStatus(ctx.db, updated.name);
      return updated;
    }),

  // Delete domain
  delete: siteAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First get the domain to check its name
      const domain = await ctx.db.domain.findUnique({
        where: { id: input.id },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      // Check if domain has departments
      const departmentCount = await ctx.db.department.count({
        where: {
          domain: domain.name,
        },
      });

      if (departmentCount > 0) {
        throw new Error("Cannot delete domain with existing departments");
      }

      const deleted = await ctx.db.domain.delete({
        where: { id: input.id },
      });
      await syncOrgGroupStatus(ctx.db, deleted.name);
      return deleted;
    }),

  // Toggle domain enabled status
  toggleEnabled: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await ctx.db.domain.findUnique({
        where: { id: input.id },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }
      if (!canManageDomain(ctx.admin, domain.name)) throw forbidden();

      const updated = await ctx.db.domain.update({
        where: { id: input.id },
        data: { enabled: !domain.enabled },
      });
      await syncOrgGroupStatus(ctx.db, updated.name);
      return updated;
    }),
});

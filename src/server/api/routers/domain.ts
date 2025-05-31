import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const domainRouter = createTRPCRouter({
  // Get all domains
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });
    if (!currentUser) return [];

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

    return ctx.db.domain.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }),
  // Get domain by name
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.domain.findUnique({
        where: { name: input.name },
      });
    }),

  // Create domain
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Domain name is required"),
        description: z.string().optional(),
        enabled: z.boolean().default(false),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.domain.create({
        data: {
          name: input.name.toLowerCase(),
          description: input.description,
          enabled: input.enabled,
        },
      });
    }),

  // Update domain
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Domain name is required").optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, ...updateData } = input;

      // If name is being updated, ensure it's lowercase
      if (updateData.name) {
        updateData.name = updateData.name.toLowerCase();
      }
      return ctx.db.domain.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete domain
  delete: protectedProcedure
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

      return ctx.db.domain.delete({
        where: { id: input.id },
      });
    }),

  // Toggle domain enabled status
  toggleEnabled: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const domain = await ctx.db.domain.findUnique({
        where: { id: input.id },
      });

      if (!domain) {
        throw new Error("Domain not found");
      }

      return ctx.db.domain.update({
        where: { id: input.id },
        data: { enabled: !domain.enabled },
      });
    }),
});

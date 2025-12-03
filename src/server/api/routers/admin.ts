import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { checkAdminPermissions } from "~/server/utils/admin-permissions";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export type DepartmentStat = {
  departmentId: string | null;
  departmentName: string | null;
  users: number;
  links: number;
  errors: number;
  purchases: number;
  kudos: number;
};

export type DomainStat = {
  domain: string;
  departments: DepartmentStat[];
};

export const adminRouter = createTRPCRouter({
  getDomainDepartmentStats: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const perms = await checkAdminPermissions(ctx.session.user.id);
      if (perms.adminLevel !== "SITE") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Site admin required" });
      }

      // Raw SQL aggregation to avoid complex Prisma groupBy across relations
      // Build a derived table of owners where we compute per-owner metrics
      // using correlated subqueries (lists_with_errors, purchases_count, kudos_count).
      // Then aggregate those owner-level metrics by domain/department to avoid
      // row-multiplication from joins.
      const sql = `
        SELECT
          owners.domain AS domain,
          owners.departmentId AS departmentId,
          d.name AS departmentName,
          COUNT(*) AS users,
          COUNT(CASE WHEN owners.amazonWishlistUrl IS NOT NULL THEN 1 END) AS links,
          COALESCE(SUM(owners.lists_with_errors), 0) AS errors,
          COALESCE(SUM(owners.purchases_count), 0) AS purchases,
          COALESCE(SUM(owners.kudos_count), 0) AS kudos
        FROM (
          SELECT
            u.id AS userId,
            COALESCE(u.domain, '') AS domain,
            u.departmentId,
            u.amazonWishlistUrl,
            (
              SELECT COUNT(DISTINCT wa.id)
              FROM \`WishlistAssignment\` wa
              JOIN \`WishlistReport\` wr ON wr.wishlistAssignmentId = wa.id AND wr.resolved = 0
              WHERE wa.wishlistOwnerId = u.id
            ) AS lists_with_errors,
            (
              SELECT COUNT(*)
              FROM \`Purchase\` p
              JOIN \`WishlistAssignment\` wa2 ON wa2.id = p.wishlistAssignmentId
              WHERE wa2.wishlistOwnerId = u.id
            ) AS purchases_count,
            (
              SELECT COUNT(*)
              FROM \`Kudos\` k2
              WHERE k2.userId = u.id
            ) AS kudos_count
          FROM \`User\` u
        ) owners
        LEFT JOIN \`Department\` d ON d.id = owners.departmentId
        GROUP BY owners.domain, owners.departmentId
        ORDER BY domain ASC, departmentName ASC
      `;

      type Row = {
        domain: string | null;
        departmentId: string | null;
        departmentName: string | null;
        users: number | null;
        links: number | null;
        errors: number | null;
        purchases: number | null;
        kudos: number | null;
      };

      const rows = await db.$queryRawUnsafe<Row[]>(sql);

      const map: Record<string, DomainStat> = {};
      for (const r of rows) {
        const domain = r.domain ?? "(no domain)";
        map[domain] ??= { domain, departments: [] };
        map[domain].departments.push({
          departmentId: r.departmentId ?? null,
          departmentName: r.departmentName ?? null,
          users: Number(r.users ?? 0),
          links: Number(r.links ?? 0),
          errors: Number(r.errors ?? 0),
          purchases: Number(r.purchases ?? 0),
          kudos: Number(r.kudos ?? 0),
        });
      }

      const result: DomainStat[] = Object.values(map);
      return result;
    }),
});

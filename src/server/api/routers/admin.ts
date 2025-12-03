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
      // Use aggregated derived tables per owner to avoid row multiplication
      // and correlated subqueries. We pre-aggregate lists-with-errors, purchases,
      // and kudos grouped by owner, join those to users, then aggregate by
      // domain/department.
      const sql = `
        SELECT
          COALESCE(u.domain, '') AS domain,
          u.departmentId AS departmentId,
          d.name AS departmentName,
          COUNT(*) AS users,
          SUM(CASE WHEN u.amazonWishlistUrl IS NOT NULL THEN 1 ELSE 0 END) AS links,
          COALESCE(SUM(COALESCE(wr.lists_with_errors, 0)), 0) AS errors,
          COALESCE(SUM(COALESCE(p.purchases_count, 0)), 0) AS purchases,
          COALESCE(SUM(COALESCE(k.kudos_count, 0)), 0) AS kudos
        FROM \`User\` u
        LEFT JOIN \`Department\` d ON d.id = u.departmentId
        LEFT JOIN (
          SELECT wa.wishlistOwnerId AS ownerId, COUNT(DISTINCT wa.id) AS lists_with_errors
          FROM \`WishlistAssignment\` wa
          JOIN \`WishlistReport\` wr ON wr.wishlistAssignmentId = wa.id AND wr.resolved = 0
          GROUP BY wa.wishlistOwnerId
        ) wr ON wr.ownerId = u.id
        LEFT JOIN (
          SELECT wa.wishlistOwnerId AS ownerId, COUNT(*) AS purchases_count
          FROM \`Purchase\` p
          JOIN \`WishlistAssignment\` wa ON wa.id = p.wishlistAssignmentId
          GROUP BY wa.wishlistOwnerId
        ) p ON p.ownerId = u.id
        LEFT JOIN (
          SELECT k2.userId AS ownerId, COUNT(*) AS kudos_count
          FROM \`Kudos\` k2
          GROUP BY k2.userId
        ) k ON k.ownerId = u.id
        GROUP BY u.domain, u.departmentId
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

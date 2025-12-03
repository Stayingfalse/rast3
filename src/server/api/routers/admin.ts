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
      // We compute per-user counts of distinct wishlist-assignments that have at least
      // one unresolved report, then sum those counts per department. This ensures
      // the "errors" value counts unique wishlists with >=1 report (not total reports).
      const sql = `
        SELECT
          COALESCE(u.domain, '') AS domain,
          u.departmentId AS departmentId,
          d.name AS departmentName,
          COUNT(DISTINCT u.id) AS users,
          COUNT(DISTINCT CASE WHEN u.amazonWishlistUrl IS NOT NULL THEN u.id END) AS links,
          COALESCE(SUM(lwe.lists_with_errors), 0) AS errors,
          COUNT(DISTINCT p.id) AS purchases,
          COUNT(DISTINCT k.id) AS kudos
        FROM \`User\` u
        LEFT JOIN \`Department\` d ON d.id = u.departmentId
        -- per-user counts of distinct wishlist assignments that have unresolved reports
        LEFT JOIN (
          SELECT wa.wishlistOwnerId AS ownerId, COUNT(DISTINCT wa.id) AS lists_with_errors
          FROM \`WishlistAssignment\` wa
          JOIN \`WishlistReport\` wr ON wr.wishlistAssignmentId = wa.id AND wr.resolved = 0
          GROUP BY wa.wishlistOwnerId
        ) lwe ON lwe.ownerId = u.id
        LEFT JOIN \`WishlistAssignment\` wa ON wa.wishlistOwnerId = u.id
        LEFT JOIN \`Purchase\` p ON p.wishlistAssignmentId = wa.id
        LEFT JOIN \`Kudos\` k ON k.userId = u.id
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

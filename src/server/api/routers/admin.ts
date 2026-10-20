import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, siteAdminProcedure } from "~/server/api/trpc";
import {
  affiliateFor,
  getAffiliateSettings,
  TRACKING_ID,
} from "~/server/affiliate";
import { getMigrations, getSchemaSync, processStartedAt } from "~/server/health";
import { seasonYearOf } from "~/server/stamps";

const KINDS = ["ORG", "TEAM", "COMMUNITY", "FRIENDS"] as const;
const STATUSES = ["PENDING", "ACTIVE", "DISABLED"] as const;
const USERS_PAGE = 25;

/**
 * Site admin console (Day 17): one overview, every group and every person.
 * Organisers run their own groups from /groups/[id]/manage (Day 16).
 */
export const adminRouter = createTRPCRouter({
  overview: siteAdminProcedure.query(async ({ ctx }) => {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      users,
      profiles,
      wishlists,
      joinedThisWeek,
      byKindStatus,
      pickUps,
      gifts,
      kudos,
      openReports,
      providers,
      migrations,
      schemaSync,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { profileCompleted: true } }),
      ctx.db.user.count({ where: { amazonWishlistUrl: { not: null } } }),
      ctx.db.membership.findMany({
        where: { joinedAt: { gte: week } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      ctx.db.group.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
      ctx.db.wishlistAssignment.count({ where: { archived: false } }),
      ctx.db.purchase.count(),
      ctx.db.kudos.count({ where: { hidden: false } }),
      ctx.db.wishlistReport.count({ where: { resolved: false } }),
      ctx.db.authProvider.findMany({
        select: { name: true, displayName: true, enabled: true },
        orderBy: { displayName: "asc" },
      }),
      getMigrations(),
      getSchemaSync(),
    ]);

    const groups = KINDS.filter((k) => k !== "TEAM").map((kind) => {
      const count = (status: (typeof STATUSES)[number]) =>
        byKindStatus.find((r) => r.kind === kind && r.status === status)?._count._all ?? 0;
      return { kind, live: count("ACTIVE"), waiting: count("PENDING"), closed: count("DISABLED") };
    });

    return {
      people: { users, profiles, wishlists, joinedThisWeek: joinedThisWeek.length },
      gifting: { pickUps, gifts, kudos, openReports },
      groups,
      waiting: groups.reduce((n, g) => n + g.waiting, 0),
      providers,
      health: {
        database: true,
        migrations: migrations && { applied: migrations.applied, latest: migrations.latest },
        schemaSync,
        startedAt: processStartedAt(),
        environment: process.env.NODE_ENV ?? "unknown",
      },
    };
  }),

  /** Every group except teams (they're managed inside their organisation). */
  groups: siteAdminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).default(""),
        kind: z.enum(KINDS).nullable().default(null),
        status: z.enum(STATUSES).nullable().default(null),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.group.findMany({
        where: {
          kind: input.kind ?? { not: "TEAM" },
          ...(input.status && { status: input.status }),
          ...(input.q && {
            OR: [{ name: { contains: input.q } }, { emailDomain: { contains: input.q } }],
          }),
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          name: true,
          kind: true,
          status: true,
          emailDomain: true,
          discordGuildId: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
          _count: { select: { memberships: true, children: true } },
        },
      });
      return rows.map(({ _count, discordGuildId, ...g }) => ({
        ...g,
        members: _count.memberships,
        teams: _count.children,
        discord: !!discordGuildId,
      }));
    }),

  users: siteAdminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).default(""),
        page: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.q
        ? {
            OR: [
              { name: { contains: input.q } },
              { email: { contains: input.q } },
              { workEmail: { contains: input.q } },
            ],
          }
        : {};
      const [total, rows] = await Promise.all([
        ctx.db.user.count({ where }),
        ctx.db.user.findMany({
          where,
          orderBy: [{ profileCompletedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }],
          skip: input.page * USERS_PAGE,
          take: USERS_PAGE,
          select: {
            id: true,
            name: true,
            email: true,
            workEmail: true,
            adminLevel: true,
            profileCompleted: true,
            profileCompletedAt: true,
            amazonWishlistUrl: true,
            memberships: {
              where: { group: { kind: { not: "TEAM" } } },
              select: { role: true, group: { select: { id: true, name: true, kind: true } } },
            },
            _count: { select: { assignedLinks: true, purchases: true } },
          },
        }),
      ]);
      return {
        total,
        pageSize: USERS_PAGE,
        users: rows.map(({ amazonWishlistUrl, memberships, _count, ...u }) => ({
          ...u,
          hasWishlist: !!amazonWishlistUrl,
          groups: memberships.map((m) => ({ ...m.group, role: m.role })),
          pickUps: _count.assignedLinks,
          gifts: _count.purchases,
        })),
      };
    }),

  /** Make someone a site admin, or take it away (never your own). */
  setSiteAdmin: siteAdminProcedure
    .input(z.object({ userId: z.string(), siteAdmin: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.admin.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can't change your own access" });
      }
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { adminLevel: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "No such person" });
      if (input.siteAdmin === (target.adminLevel === "SITE")) return { ok: true };

      await ctx.db.user.update({
        where: { id: input.userId },
        data: { adminLevel: input.siteAdmin ? "SITE" : "USER" },
      });
      return { ok: true };
    }),

  deleteUser: siteAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.admin.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can't delete your own account here" });
      }
      await ctx.db.user.delete({ where: { id: input.userId } });
      return { ok: true };
    }),

  /** Amazon affiliate links: site settings and every group's setting this season. */
  affiliate: siteAdminProcedure.query(async ({ ctx }) => {
    const season = seasonYearOf(new Date());
    const settings = await getAffiliateSettings(ctx.db);
    const groups = await ctx.db.group.findMany({
      where: { kind: { not: "TEAM" } },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      take: 500,
      select: {
        id: true,
        name: true,
        kind: true,
        status: true,
        affiliate: true,
        affiliateTags: { where: { season }, select: { tag: true } },
        _count: { select: { memberships: true } },
      },
    });
    return {
      season,
      settings: {
        enabled: settings.enabled,
        defaultTag: settings.defaultTag,
        orgDefault: settings.orgDefault,
        communityDefault: settings.communityDefault,
        friendsDefault: settings.friendsDefault,
      },
      groups: await Promise.all(
        groups.map(async ({ affiliateTags, _count, ...g }) => {
          const now = await affiliateFor(ctx.db, g.id, season, settings);
          return {
            ...g,
            members: _count.memberships,
            tag: affiliateTags[0]?.tag ?? null,
            active: now.enabled,
            activeTag: now.enabled ? now.tag : null,
          };
        }),
      ),
    };
  }),

  setAffiliateSettings: siteAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        defaultTag: z.string().trim().toLowerCase().regex(TRACKING_ID, "Amazon.co.uk tracking IDs end in -21"),
        orgDefault: z.boolean(),
        communityDefault: z.boolean(),
        friendsDefault: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.affiliateSettings.upsert({
        where: { id: "site" },
        update: input,
        create: { id: "site", ...input },
      });
      return { ok: true };
    }),

  /** One group's mode, and its tracking ID for this season (null = the default). */
  setGroupAffiliate: siteAdminProcedure
    .input(
      z.object({
        groupId: z.string(),
        mode: z.enum(["DEFAULT", "ON", "OFF"]),
        tag: z
          .string()
          .trim()
          .toLowerCase()
          .regex(TRACKING_ID, "Amazon.co.uk tracking IDs end in -21")
          .nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const season = seasonYearOf(new Date());
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
        select: { kind: true },
      });
      if (!group || group.kind === "TEAM") {
        throw new TRPCError({ code: "NOT_FOUND", message: "No such group" });
      }
      await ctx.db.group.update({
        where: { id: input.groupId },
        data: { affiliate: input.mode },
      });
      const key = { groupId_season: { groupId: input.groupId, season } };
      if (input.tag) {
        await ctx.db.affiliateTag.upsert({
          where: key,
          update: { tag: input.tag },
          create: { groupId: input.groupId, season, tag: input.tag },
        });
      } else {
        await ctx.db.affiliateTag.deleteMany({ where: { groupId: input.groupId, season } });
      }
      return { ok: true };
    }),
});

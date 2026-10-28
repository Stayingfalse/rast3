import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, siteAdminProcedure } from "~/server/api/trpc";
import {
  affiliateFor,
  getAffiliateSettings,
  storeOfTag,
  STORE_KEYS,
  STORES,
  TRACKING_ID,
  TRACKING_ID_HINT,
  type Store,
} from "~/server/affiliate";
import { getMigrations, getSchemaSync, processStartedAt } from "~/server/health";
import { insightSeasons, seasonInsights } from "~/server/insights";
import { storeDomain } from "~/server/opens";
import { currentSeason, seasonWindow } from "~/server/season";
import { seasonRange, seasonYearOf } from "~/server/stamps";

const trackingId = z.string().trim().toLowerCase().regex(TRACKING_ID, TRACKING_ID_HINT);
const ukTag = trackingId.refine((t) => t.endsWith("-21"), "Amazon.co.uk tracking IDs end in -21");
const usTag = trackingId.refine((t) => t.endsWith("-20"), "Amazon.com tracking IDs end in -20");

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
          openEarlySeason: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
          _count: { select: { memberships: true, children: true } },
        },
      });
      const season = currentSeason();
      return rows.map(({ _count, discordGuildId, openEarlySeason, ...g }) => ({
        ...g,
        members: _count.memberships,
        teams: _count.children,
        discord: !!discordGuildId,
        openEarly: openEarlySeason === season,
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
        affiliateTags: { where: { season }, select: { tag: true, store: true } },
        _count: { select: { memberships: true } },
      },
    });
    const [pool, used] = await Promise.all([
      ctx.db.affiliateTrackingId.findMany({ orderBy: { tag: "asc" }, select: { tag: true } }),
      ctx.db.affiliateTag.findMany({
        where: { season },
        select: { tag: true, group: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      season,
      pool: pool.map(({ tag }) => ({
        tag,
        store: storeOfTag(tag),
        usedBy: used.find((u) => u.tag === tag)?.group ?? null,
      })),
      settings: {
        enabled: settings.enabled,
        defaultTag: settings.defaultTag,
        defaultTagUs: settings.defaultTagUs,
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
            tag: affiliateTags.find((t) => t.store === "UK")?.tag ?? null,
            tagUs: affiliateTags.find((t) => t.store === "US")?.tag ?? null,
            active: now.enabled,
            activeTags: now.enabled ? now.tags : null,
          };
        }),
      ),
    };
  }),

  setAffiliateSettings: siteAdminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        defaultTag: ukTag,
        defaultTagUs: usTag,
        orgDefault: z.boolean(),
        communityDefault: z.boolean(),
        friendsDefault: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // a default can't also be one group's own ID (earnings would mix)
      for (const tag of [input.defaultTag, input.defaultTagUs]) {
        const taken = await ctx.db.affiliateTag.findUnique({
          where: { season_tag: { season: seasonYearOf(new Date()), tag } },
          select: { group: { select: { name: true } } },
        });
        if (taken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${tag} is ${taken.group.name}'s own ID this season. Pick another default.`,
          });
        }
      }
      await ctx.db.affiliateSettings.upsert({
        where: { id: "site" },
        update: input,
        create: { id: "site", ...input },
      });
      return { ok: true };
    }),

  /**
   * One group's mode, and its tracking IDs for this season: `tag` for
   * Amazon.co.uk, `tagUs` for Amazon.com (null = that store's default,
   * left out = unchanged).
   */
  setGroupAffiliate: siteAdminProcedure
    .input(
      z.object({
        groupId: z.string(),
        mode: z.enum(["DEFAULT", "ON", "OFF"]),
        tag: ukTag.nullable(),
        tagUs: usTag.nullable().optional(),
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
      const settings = await getAffiliateSettings(ctx.db);
      const wanted: [Store, string | null | undefined][] = [
        ["uk", input.tag],
        ["us", input.tagUs],
      ];
      // check everything before changing anything
      for (const [store, tag] of wanted) {
        if (!tag) continue;
        if (tag === (store === "uk" ? settings.defaultTag : settings.defaultTagUs)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That's the default ID every other group uses. Give this group its own.",
          });
        }
        if (!(await ctx.db.affiliateTrackingId.findUnique({ where: { tag } }))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Add that tracking ID to the pool first." });
        }
        const taken = await ctx.db.affiliateTag.findUnique({
          where: { season_tag: { season, tag } },
          select: { groupId: true, group: { select: { name: true } } },
        });
        if (taken && taken.groupId !== input.groupId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${tag} is already used by ${taken.group.name} this season.`,
          });
        }
      }
      await ctx.db.group.update({
        where: { id: input.groupId },
        data: { affiliate: input.mode },
      });
      for (const [store, tag] of wanted) {
        if (tag === undefined) continue;
        const STORE = store === "uk" ? "UK" : "US";
        if (tag) {
          await ctx.db.affiliateTag.upsert({
            where: { groupId_season_store: { groupId: input.groupId, season, store: STORE } },
            update: { tag },
            create: { groupId: input.groupId, season, store: STORE, tag },
          });
        } else {
          await ctx.db.affiliateTag.deleteMany({ where: { groupId: input.groupId, season, store: STORE } });
        }
      }
      return { ok: true };
    }),

  /** Add tracking IDs (created in Associates Central) to the pool. */
  addTrackingIds: siteAdminProcedure
    .input(
      z.object({
        tags: z
          .array(
            z.string().trim().toLowerCase().regex(TRACKING_ID, TRACKING_ID_HINT),
          )
          .min(1)
          .max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.affiliateTrackingId.createMany({
        data: [...new Set(input.tags)].map((tag) => ({ tag })),
        skipDuplicates: true,
      });
      return { added: count };
    }),

  /** Take an ID out of the pool (not while a group uses it this season). */
  removeTrackingId: siteAdminProcedure
    .input(z.object({ tag: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inUse = await ctx.db.affiliateTag.findUnique({
        where: { season_tag: { season: seasonYearOf(new Date()), tag: input.tag } },
        select: { id: true },
      });
      if (inUse) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A group uses that tracking ID this season. Change the group first.",
        });
      }
      await ctx.db.affiliateTrackingId.deleteMany({ where: { tag: input.tag } });
      return { ok: true };
    }),

  /**
   * Wishlist opens this season (owner, 23 Oct): by Amazon store, with the
   * opens we couldn't tag although the group had affiliate links on (the
   * stores worth an Associates account next), and by group.
   */
  opens: siteAdminProcedure.query(async ({ ctx }) => {
    const season = currentSeason();
    const where = { season };
    const [all, tagged, missed, viaGiftPage, byGroup, pickedUp, lists] = await Promise.all([
      ctx.db.wishlistOpen.groupBy({ by: ["store"], where, _count: { _all: true } }),
      ctx.db.wishlistOpen.groupBy({ by: ["store"], where: { ...where, tagged: true }, _count: { _all: true } }),
      ctx.db.wishlistOpen.groupBy({
        by: ["store"],
        where: { ...where, affiliateOn: true, tagged: false },
        _count: { _all: true },
      }),
      ctx.db.wishlistOpen.count({ where: { ...where, viaGiftPage: true } }),
      ctx.db.wishlistOpen.groupBy({
        by: ["groupId"],
        where: { ...where, groupId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { groupId: "desc" } },
        take: 30,
      }),
      ctx.db.wishlistAssignment.count({ where: { season } }),
      ctx.db.user.findMany({ where: { amazonWishlistUrl: { not: null } }, select: { amazonWishlistUrl: true } }),
    ]);
    const count = (rows: { store: string; _count: { _all: number } }[], store: string) =>
      rows.find((r) => r.store === store)?._count._all ?? 0;
    const onFile = new Map<string, number>();
    for (const { amazonWishlistUrl } of lists) {
      const d = storeDomain(amazonWishlistUrl);
      onFile.set(d, (onFile.get(d) ?? 0) + 1);
    }
    const stores = [...new Set([...onFile.keys(), ...all.map((r) => r.store)])]
      .map((store) => ({
        store,
        lists: onFile.get(store) ?? 0,
        opens: count(all, store),
        tagged: count(tagged, store),
        missed: count(missed, store),
        account: STORE_KEYS.some((k) => STORES[k].domain === store),
      }))
      .sort((a, b) => b.missed - a.missed || b.opens - a.opens || b.lists - a.lists);
    const names = await ctx.db.group.findMany({
      where: { id: { in: byGroup.map((g) => g.groupId!) } },
      select: { id: true, name: true, kind: true },
    });
    return {
      season,
      pickedUp,
      opens: all.reduce((n, r) => n + r._count._all, 0),
      viaGiftPage,
      stores,
      // groups since deleted drop out of the list (their opens still count above)
      groups: byGroup
        .flatMap((g) => {
          const group = names.find((n) => n.id === g.groupId);
          return group ? [{ ...group, opens: g._count._all }] : [];
        })
        .slice(0, 15),
    };
  }),

  /**
   * Day 27: the season's funnel, giving by kind of group, week by week and
   * affiliate opens, for the 2027 monetisation case. Counts only.
   */
  insights: siteAdminProcedure
    .input(z.object({ season: z.number().int().min(2020).max(2100).optional() }))
    .query(async ({ ctx, input }) => {
      const current = currentSeason();
      const [data, seasons] = await Promise.all([
        seasonInsights(ctx.db, input.season ?? current, { current }),
        insightSeasons(ctx.db, current),
      ]);
      return { ...data, seasons, current };
    }),

  /** Day 18: this season's dates, check-ins and the groups opened early. */
  season: siteAdminProcedure.query(async ({ ctx }) => {
    const year = currentSeason();
    const [w, members, checkedIn, early] = await Promise.all([
      seasonWindow(ctx.db, year),
      ctx.db.user.count({ where: { profileCompleted: true } }),
      ctx.db.seasonCheckIn.count({ where: { season: year } }),
      ctx.db.group.findMany({
        where: { openEarlySeason: year },
        orderBy: { name: "asc" },
        select: { id: true, name: true, kind: true },
      }),
    ]);
    return { ...w, members, checkedIn, openEarly: early };
  }),

  setSeasonDates: siteAdminProcedure
    .input(
      z
        .object({ opensAt: z.coerce.date(), closesAt: z.coerce.date() })
        .refine((d) => d.closesAt > d.opensAt, "The season must close after it opens"),
    )
    .mutation(async ({ ctx, input }) => {
      const year = currentSeason();
      // both dates inside this season's year (1 Aug to 31 Jul)
      const { gte, lt } = seasonRange(year);
      if (input.opensAt < gte || input.closesAt >= lt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Christmas ${year} has to open and close between 1 August ${year} and 31 July ${year + 1}.`,
        });
      }
      await ctx.db.season.upsert({
        where: { year },
        update: input,
        create: { id: `season_${year}`, year, ...input },
      });
      return { ok: true };
    }),

  /** Let a group (and its teams) pick up outside the season's dates. */
  setOpenEarly: siteAdminProcedure
    .input(z.object({ groupId: z.string(), open: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.group.update({
        where: { id: input.groupId },
        data: { openEarlySeason: input.open ? currentSeason() : null },
      });
      return { ok: true };
    }),
});

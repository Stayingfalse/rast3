import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  rateLimit,
  siteAdminProcedure,
} from "~/server/api/trpc";
import type { PrismaClient } from "@prisma/client";
import {
  fetchMyGuilds,
  fetchMyRoles,
  getDiscordToken,
  isSnowflake,
} from "~/server/discord";
import { ensureOrgGroup, findOrgGroup, syncUserGroups } from "~/server/groups";
import {
  findInvite,
  INVITE_KINDS,
  newJoinCode,
  normaliseJoinCode,
} from "~/server/invites";
import {
  emailDomain,
  isPublicEmailDomain,
} from "~/server/public-email-domains";

const HOUR = 60 * 60_000;
/** Most groups one person can start (while it's free, owner approves each). */
const MAX_CREATED = 10;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "group";

const notFound = () =>
  new TRPCError({
    code: "NOT_FOUND",
    message: "That invite code doesn't work. Check it with whoever sent it.",
  });

/**
 * Day 10: friends and community groups people start themselves and invite
 * others to with a link or code. New groups wait for a site admin's approval
 * (owner, 18 Oct) before they can be used for gifting.
 */
const workEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid work email");

/** Another account already using this work email? */
async function assertWorkEmailFree(
  db: PrismaClient,
  email: string,
  userId: string,
) {
  const owner = await db.user.findUnique({
    where: { workEmail: email },
    select: { id: true },
  });
  if (owner && owner.id !== userId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That work email is already used by another account.",
    });
  }
}

export const groupsRouter = createTRPCRouter({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.membership.findMany({
      where: {
        userId: ctx.session.user.id,
        group: { kind: { in: [...INVITE_KINDS] } },
      },
      orderBy: { joinedAt: "desc" },
      select: {
        role: true,
        group: {
          select: {
            id: true,
            name: true,
            kind: true,
            status: true,
            joinCode: true,
            discordGuildId: true,
            discordRoleId: true,
            _count: { select: { memberships: true } },
          },
        },
      },
    });
    return rows.map(({ role, group }) => ({
      id: group.id,
      name: group.name,
      kind: group.kind,
      status: group.status,
      role,
      members: group._count.memberships,
      // only organisers can see and share the code
      joinCode: role === "ADMIN" ? group.joinCode : null,
      discord:
        role === "ADMIN"
          ? { guildId: group.discordGuildId, roleId: group.discordRoleId }
          : null,
    }));
  }),

  create: protectedProcedure
    .use(rateLimit("groups.create", 5, HOUR))
    .input(
      z.object({
        name: z.string().trim().min(2, "Give your group a name").max(60),
        kind: z.enum(INVITE_KINDS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const created = await ctx.db.group.count({
        where: { createdById: userId },
      });
      if (created >= MAX_CREATED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can start up to ${MAX_CREATED} groups.`,
        });
      }
      const group = await ctx.db.group.create({
        data: {
          kind: input.kind,
          name: input.name,
          slug: `${slugify(input.name)}-${randomBytes(3).toString("hex")}`,
          status: "PENDING",
          joinCode: newJoinCode(),
          createdById: userId,
          memberships: { create: { userId, role: "ADMIN" } },
        },
        select: { id: true, joinCode: true },
      });
      return group;
    }),

  join: protectedProcedure
    .use(rateLimit("groups.join", 20, HOUR))
    .input(z.object({ code: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const invite = await findInvite(input.code);
      if (!invite) throw notFound();
      await ctx.db.membership.upsert({
        where: {
          groupId_userId: { groupId: invite.id, userId: ctx.session.user.id },
        },
        update: {},
        create: { groupId: invite.id, userId: ctx.session.user.id },
      });
      return { id: invite.id, name: invite.name };
    }),

  /** Organisers: replace the code so old links stop working. */
  newCode: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
        select: { role: true, group: { select: { kind: true } } },
      });
      if (
        membership?.role !== "ADMIN" ||
        !(INVITE_KINDS as readonly string[]).includes(membership.group.kind)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organisers only" });
      }
      return ctx.db.group.update({
        where: { id: input.groupId },
        data: { joinCode: newJoinCode() },
        select: { id: true, joinCode: true },
      });
    }),

  leave: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
        select: {
          kind: true,
          memberships: { select: { userId: true, role: true } },
        },
      });
      const me = group?.memberships.find((m) => m.userId === userId);
      if (
        !group ||
        !me ||
        !(INVITE_KINDS as readonly string[]).includes(group.kind)
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const others = group.memberships.filter((m) => m.userId !== userId);
      if (others.length === 0) {
        // Last one out closes the group
        await ctx.db.group.delete({ where: { id: input.groupId } });
        return { deleted: true };
      }
      if (me.role === "ADMIN" && !others.some((m) => m.role === "ADMIN")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You're the only organiser. Make someone else an organiser first.",
        });
      }
      await ctx.db.membership.delete({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      return { deleted: false };
    }),

  /**
   * Day 12: your organisation (work email, team, status) and its teams, for
   * the "Your workplace" card. Null if you're not in one.
   */
  myOrganisation: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { domain: true, workEmail: true, departmentId: true },
    });
    if (!user?.domain) return null;
    const org = await findOrgGroup(ctx.db, user.domain);
    if (!org) return null;
    const teams = await ctx.db.department.findMany({
      where: { domain: org.emailDomain ?? "" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return {
      id: org.id,
      name: org.name,
      status: org.status,
      workEmail: user.workEmail,
      teamId: user.departmentId,
      teams,
    };
  }),

  /**
   * Join your organisation with your work email (on trust, plus its join code
   * when it has one). Expected outcomes come back as a result, not an error,
   * so the page can offer the next step.
   */
  joinOrganisation: protectedProcedure
    .use(rateLimit("groups.joinOrganisation", 20, HOUR))
    .input(z.object({ workEmail, joinCode: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const domain = emailDomain(input.workEmail);
      if (isPublicEmailDomain(domain))
        return { result: "publicDomain" as const, domain };
      const org = await findOrgGroup(ctx.db, domain);
      if (!org) return { result: "noOrganisation" as const, domain };
      if (org.status === "DISABLED")
        return { result: "closed" as const, domain, name: org.name };

      const already = await ctx.db.membership.findUnique({
        where: { groupId_userId: { groupId: org.id, userId } },
        select: { id: true },
      });
      if (org.joinCode && !already) {
        const given = normaliseJoinCode(input.joinCode ?? "");
        if (given !== org.joinCode) {
          return {
            result: given ? ("wrongCode" as const) : ("needsCode" as const),
            domain,
            name: org.name,
          };
        }
      }
      await assertWorkEmailFree(ctx.db, input.workEmail, userId);

      const current = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { domain: true },
      });
      const switching = current?.domain?.trim().toLowerCase() !== domain;
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          workEmail: input.workEmail,
          domain,
          ...(switching ? { departmentId: null } : {}),
        },
      });
      await syncUserGroups(ctx.db, userId);
      return {
        result: "joined" as const,
        domain,
        name: org.name,
        status: org.status,
      };
    }),

  /**
   * Start an organisation for your work email's domain. Personal email
   * providers can't; new organisations wait for a site admin (owner, 18 Oct).
   */
  startOrganisation: protectedProcedure
    .use(rateLimit("groups.startOrganisation", 3, HOUR))
    .input(
      z.object({
        workEmail,
        description: z.string().trim().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const domain = emailDomain(input.workEmail);
      if (isPublicEmailDomain(domain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Personal email addresses can't start an organisation. Start a community or friends group instead.",
        });
      }
      if (
        (await findOrgGroup(ctx.db, domain)) ??
        (await ctx.db.domain.findUnique({ where: { name: domain } }))
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${domain} is already on Random Acts of Santa. Join it with your work email instead.`,
        });
      }
      await assertWorkEmailFree(ctx.db, input.workEmail, userId);

      await ctx.db.domain.create({
        data: {
          name: domain,
          enabled: false,
          description: input.description,
          createdById: userId,
        },
      });
      const org = await ensureOrgGroup(ctx.db, domain);
      await ctx.db.group.update({
        where: { id: org!.id },
        data: {
          status: "PENDING",
          createdById: userId,
          description: input.description,
        },
      });
      const me = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { adminLevel: true },
      });
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          workEmail: input.workEmail,
          domain,
          departmentId: null,
          // the founder organises it (site admins keep their site role)
          ...(me?.adminLevel === "SITE"
            ? {}
            : { adminLevel: "DOMAIN" as const, adminScope: domain }),
        },
      });
      await syncUserGroups(ctx.db, userId);
      return { domain, status: "PENDING" as const };
    }),

  /** Choose (or clear) your team within your organisation. */
  setMyTeam: protectedProcedure
    .input(z.object({ departmentId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { domain: true },
      });
      if (!user?.domain) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Join your organisation first.",
        });
      }
      if (input.departmentId) {
        const dept = await ctx.db.department.findUnique({
          where: { id: input.departmentId },
        });
        if (
          dept?.domain.trim().toLowerCase() !== user.domain.trim().toLowerCase()
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That team isn't in your organisation.",
          });
        }
      }
      await ctx.db.user.update({
        where: { id: userId },
        data: { departmentId: input.departmentId },
      });
      await syncUserGroups(ctx.db, userId);
      return { ok: true };
    }),

  /** Leave your organisation (e.g. wrong work email). Your account stays. */
  leaveOrganisation: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const me = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { adminLevel: true },
    });
    await ctx.db.user.update({
      where: { id: userId },
      data: {
        domain: null,
        departmentId: null,
        workEmail: null,
        ...(me?.adminLevel === "SITE"
          ? {}
          : { adminLevel: "USER" as const, adminScope: null }),
      },
    });
    await ctx.db.wishlistAssignment.updateMany({
      where: { assignedUserId: userId, isActive: true },
      data: { isActive: false },
    });
    await syncUserGroups(ctx.db, userId);
    return { ok: true };
  }),

  /**
   * Day 13, organisers: link a community group to a Discord server (and
   * optionally a role) so members can join by being in that server.
   */
  setDiscordLink: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        guildId: z.string().trim().nullable(),
        roleId: z.string().trim().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const m = await ctx.db.membership.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
        select: { role: true, group: { select: { kind: true } } },
      });
      if (m?.role !== "ADMIN" || m.group.kind !== "COMMUNITY") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Community organisers only",
        });
      }
      const guildId = input.guildId ?? null;
      const roleId = (input.roleId ?? "") === "" ? null : input.roleId!;
      if (
        (guildId && !isSnowflake(guildId)) ||
        (roleId && !isSnowflake(roleId))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Discord ids are 17 to 20 digits. Copy them with Developer Mode on.",
        });
      }
      if (guildId) {
        const taken = await ctx.db.group.findUnique({
          where: { discordGuildId: guildId },
          select: { id: true },
        });
        if (taken && taken.id !== input.groupId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That Discord server is already linked to another group.",
          });
        }
      }
      return ctx.db.group.update({
        where: { id: input.groupId },
        data: {
          discordGuildId: guildId,
          discordRoleId: guildId ? roleId : null,
        },
        select: { id: true, discordGuildId: true, discordRoleId: true },
      });
    }),

  /**
   * Day 13: community groups linked to Discord servers you're in. Returns
   * { needsDiscord } when you haven't connected Discord (with server access).
   */
  discordMatches: protectedProcedure
    .use(rateLimit("groups.discordMatches", 30, HOUR))
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const token = await getDiscordToken(userId);
      if (!token) return { needsDiscord: true as const, groups: [] };
      const guilds = await fetchMyGuilds(token);
      if (!guilds) return { needsDiscord: true as const, groups: [] };
      const groups = await ctx.db.group.findMany({
        where: {
          kind: "COMMUNITY",
          status: { not: "DISABLED" },
          discordGuildId: { in: guilds.map((g) => g.id) },
        },
        select: {
          id: true,
          name: true,
          status: true,
          discordGuildId: true,
          discordRoleId: true,
          memberships: { where: { userId }, select: { id: true } },
          _count: { select: { memberships: true } },
        },
      });
      const out = [];
      for (const g of groups) {
        const roleOk = g.discordRoleId
          ? ((await fetchMyRoles(token, g.discordGuildId!)) ?? []).includes(
              g.discordRoleId,
            )
          : true;
        out.push({
          id: g.id,
          name: g.name,
          status: g.status,
          members: g._count.memberships,
          server: guilds.find((x) => x.id === g.discordGuildId)?.name ?? "",
          alreadyMember: g.memberships.length > 0,
          roleOk,
        });
      }
      return { needsDiscord: false as const, groups: out };
    }),

  /** Join a community group because you're in its Discord server (re-checked). */
  joinViaDiscord: protectedProcedure
    .use(rateLimit("groups.joinViaDiscord", 20, HOUR))
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
        select: {
          id: true,
          name: true,
          kind: true,
          status: true,
          discordGuildId: true,
          discordRoleId: true,
        },
      });
      if (
        !group?.discordGuildId ||
        group.kind !== "COMMUNITY" ||
        group.status === "DISABLED"
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const token = await getDiscordToken(userId);
      if (!token) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connect Discord first.",
        });
      }
      const roles = await fetchMyRoles(token, group.discordGuildId);
      if (!roles) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You're not in that Discord server.",
        });
      }
      if (group.discordRoleId && !roles.includes(group.discordRoleId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "That community needs a Discord role you don't have yet.",
        });
      }
      await ctx.db.membership.upsert({
        where: { groupId_userId: { groupId: group.id, userId } },
        update: {},
        create: { groupId: group.id, userId },
      });
      return { id: group.id, name: group.name };
    }),

  /** Site admins: groups and organisations by status, newest first. */
  forReview: siteAdminProcedure
    .input(z.object({ status: z.enum(["PENDING", "ACTIVE", "DISABLED"]) }))
    .query(async ({ ctx, input }) => {
      const groups = await ctx.db.group.findMany({
        where: { status: input.status, kind: { in: ["ORG", ...INVITE_KINDS] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          kind: true,
          status: true,
          emailDomain: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
          _count: { select: { memberships: true } },
        },
      });
      return groups.map(({ _count, ...g }) => ({
        ...g,
        members: _count.memberships,
      }));
    }),

  /**
   * Site admins: approve (ACTIVE), close (DISABLED) or re-queue a group. For
   * organisations the legacy Domain row follows, so older screens agree.
   */
  setStatus: siteAdminProcedure
    .input(
      z.object({
        groupId: z.string(),
        status: z.enum(["PENDING", "ACTIVE", "DISABLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.update({
        where: { id: input.groupId },
        data: { status: input.status },
        select: { id: true, status: true, kind: true, emailDomain: true },
      });
      if (group.kind === "ORG" && group.emailDomain) {
        await ctx.db.domain.upsert({
          where: { name: group.emailDomain },
          update: { enabled: input.status === "ACTIVE" },
          create: {
            name: group.emailDomain,
            enabled: input.status === "ACTIVE",
            createdById: ctx.session.user.id,
          },
        });
      }
      return { id: group.id, status: group.status };
    }),

  /** Organisers: their organisations and each one's join code (if any). */
  myOrgs: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.membership.findMany({
      where: {
        userId: ctx.session.user.id,
        role: "ADMIN",
        group: { kind: "ORG" },
      },
      select: {
        group: {
          select: { id: true, name: true, status: true, joinCode: true },
        },
      },
    });
    return rows.map((r) => r.group);
  }),

  /** Organisers: require a join code for the organisation, change it, or drop it. */
  setOrgCode: protectedProcedure
    .input(z.object({ groupId: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const m = await ctx.db.membership.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
        select: { role: true, group: { select: { kind: true } } },
      });
      if (m?.role !== "ADMIN" || m.group.kind !== "ORG") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Organisers only" });
      }
      return ctx.db.group.update({
        where: { id: input.groupId },
        data: { joinCode: input.enabled ? newJoinCode() : null },
        select: { id: true, joinCode: true },
      });
    }),
});

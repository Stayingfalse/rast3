import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  rateLimit,
  siteAdminProcedure,
} from "~/server/api/trpc";
import {
  findInvite,
  INVITE_KINDS,
  newJoinCode,
} from "~/server/invites";

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
          groupId_userId: { groupId: input.groupId, userId: ctx.session.user.id },
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
      if (!group || !me || !(INVITE_KINDS as readonly string[]).includes(group.kind)) {
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
          message: "You're the only organiser. Make someone else an organiser first.",
        });
      }
      await ctx.db.membership.delete({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      return { deleted: false };
    }),

  /** Site admins: approve, re-open or close a group (approval UI is Day 11). */
  setStatus: siteAdminProcedure
    .input(
      z.object({
        groupId: z.string(),
        status: z.enum(["PENDING", "ACTIVE", "DISABLED"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.group.update({
        where: { id: input.groupId },
        data: { status: input.status },
        select: { id: true, status: true },
      }),
    ),
});

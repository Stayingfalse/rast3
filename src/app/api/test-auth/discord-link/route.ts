import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DISCORD_FEATURES,
  DISCORD_ROLES,
  type DiscordFeature,
  type DiscordRole,
} from "~/lib/discord-server";
import { db } from "~/server/db";
import { isSnowflake, linkDiscordServer } from "~/server/discord";
import { isTestAuthAuthorised, testDomain } from "~/server/utils/test-auth";

/**
 * Test-only (same gate as ../login): dev has no Discord sign-in, so this
 * links a community started by one of this run's test users to a pretend
 * Discord server, as if its organiser had picked one they run. It goes
 * through the same code as the real link (approval included).
 *
 * POST { groupId, server: { id, name, members, online?, iconHash?, features?,
 * linkedBy? } | null } -> the group
 */
const body = z.object({
  groupId: z.string(),
  server: z
    .object({
      id: z.string().refine(isSnowflake),
      name: z.string().min(1).max(200),
      iconHash: z.string().max(64).nullable().default(null),
      members: z.number().int().nonnegative().nullable(),
      online: z.number().int().nonnegative().nullable().default(null),
      features: z.array(z.enum(Object.keys(DISCORD_FEATURES) as [DiscordFeature, ...DiscordFeature[]])).default([]),
      linkedBy: z.enum(Object.keys(DISCORD_ROLES) as [DiscordRole, ...DiscordRole[]]).default("OWNER"),
    })
    .nullable(),
});

export async function POST(req: NextRequest) {
  if (!isTestAuthAuthorised(req)) return new NextResponse("Not Found", { status: 404 });
  const input = body.safeParse(await req.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: input.error.message }, { status: 400 });
  const group = await db.group.findFirst({
    where: {
      id: input.data.groupId,
      kind: "COMMUNITY",
      createdBy: { email: { endsWith: `@${testDomain(req)}` } },
    },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not a test community" }, { status: 404 });
  const { server } = input.data;
  if (server) {
    const taken = await db.group.findUnique({ where: { discordGuildId: server.id }, select: { id: true } });
    if (taken && taken.id !== group.id) return NextResponse.json({ error: "Server already linked" }, { status: 409 });
  }
  return NextResponse.json(await linkDiscordServer(db, group.id, server));
}

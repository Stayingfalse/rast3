import type { PrismaClient } from "@prisma/client";

import { db } from "~/server/db";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger("discord");

/**
 * Day 13: joining a community group through its Discord server. `guilds`
 * lists the servers someone is in (with their permissions there). No bot, so
 * no role checks (owner, 20 Oct).
 */
export const DISCORD_SCOPES = "identify email guilds";
const API = "https://discord.com/api/v10";

/** Discord ids are snowflakes: 17 to 20 digits. */
export const isSnowflake = (id: string) => /^\d{17,20}$/.test(id);

type TokenAccount = {
  provider: string;
  providerAccountId: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  scope?: string | null;
};

/**
 * Auth.js only stores tokens when an account is first linked, so a returning
 * Discord sign-in (e.g. after we widened the scopes) would keep the old token.
 * Called from the signIn event to keep them fresh.
 */
export async function saveDiscordTokens(
  account: TokenAccount | null | undefined,
) {
  if (account?.provider !== "discord" || !account.access_token) return;
  await db.account
    .update({
      where: {
        provider_providerAccountId: {
          provider: "discord",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: account.access_token,
        refresh_token: account.refresh_token ?? undefined,
        expires_at: account.expires_at ?? undefined,
        scope: account.scope ?? undefined,
      },
    })
    .catch(() => undefined); // first link: the adapter creates the row itself
}

async function refresh(accountId: string, refreshToken: string) {
  const id = process.env.AUTH_DISCORD_ID;
  const secret = process.env.AUTH_DISCORD_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "Discord token refresh failed");
    return null;
  }
  const t = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
  await db.account.update({
    where: { id: accountId },
    data: {
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + t.expires_in,
      scope: t.scope,
    },
  });
  return t.access_token;
}

/**
 * A usable Discord token with the guild scopes for this person, or null when
 * they need to (re)connect Discord.
 */
export async function getDiscordToken(userId: string): Promise<string | null> {
  const account = await db.account.findFirst({
    where: { userId, provider: "discord" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });
  if (!account?.access_token || !account.scope?.split(" ").includes("guilds"))
    return null;
  const expired = account.expires_at
    ? account.expires_at * 1000 < Date.now() + 60_000
    : false;
  if (!expired) return account.access_token;
  return account.refresh_token
    ? refresh(account.id, account.refresh_token)
    : null;
}

type Guild = {
  id: string;
  name: string;
  icon: string | null;
  owner?: boolean;
  permissions?: string;
  approximate_member_count?: number;
};

/** The servers this person is in, with their rough member counts. */
export async function fetchMyGuilds(token: string) {
  const res = await fetch(`${API}/users/@me/guilds?with_counts=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "Discord guild list failed");
    return null;
  }
  return (await res.json()) as Guild[];
}

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

/** Servers this person owns or manages (Administrator or Manage Server). */
export function manageable(guilds: Guild[]) {
  return guilds
    .filter((g) => {
      if (g.owner) return true;
      const perms = BigInt(g.permissions ?? "0");
      return (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n;
    })
    .map((g) => ({
      id: g.id,
      name: g.name,
      members: g.approximate_member_count ?? null,
      icon: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`
        : null,
    }));
}

/** A server as Discord described it to the organiser who linked it. */
export type LinkedServer = { id: string; name: string; members: number | null };

/**
 * Links a community group to a Discord server (already checked: the
 * organiser runs it, and no other group has it), recording its name and
 * rough size for site admins. A community still waiting for approval goes
 * live: being run from a real Discord server is the check (owner, 6 Nov).
 * One a site admin closed stays closed. Unlinking keeps the group's status.
 */
export async function linkDiscordServer(
  db: Pick<PrismaClient, "group">,
  groupId: string,
  server: LinkedServer | null,
) {
  const before = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { status: true, kind: true },
  });
  const approve = !!server && before.kind === "COMMUNITY" && before.status === "PENDING";
  const group = await db.group.update({
    where: { id: groupId },
    data: server
      ? {
          discordGuildId: server.id,
          discordRoleId: null,
          discordGuildName: server.name.slice(0, 100),
          discordMemberCount: server.members,
          discordLinkedAt: new Date(),
          ...(approve && { status: "ACTIVE" as const }),
        }
      : {
          discordGuildId: null,
          discordRoleId: null,
          discordGuildName: null,
          discordMemberCount: null,
          discordLinkedAt: null,
        },
    select: { id: true, name: true, status: true, discordGuildId: true, discordGuildName: true },
  });
  if (approve) logger.info({ groupId, guildId: server.id }, "Community approved through its Discord server");
  return { ...group, approved: approve };
}

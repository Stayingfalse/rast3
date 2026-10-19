import { db } from "~/server/db";
import { createChildLogger } from "~/utils/logger";

const logger = createChildLogger("discord");

/**
 * Day 13: joining a community group through its Discord server.
 * `guilds` lists the servers someone is in; `guilds.members.read` lets us read
 * their roles in one server (for groups that require a role). No bot needed.
 */
export const DISCORD_SCOPES = "identify email guilds guilds.members.read";
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

/** The servers this person is in. */
export async function fetchMyGuilds(token: string) {
  const res = await fetch(`${API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "Discord guild list failed");
    return null;
  }
  return (await res.json()) as { id: string; name: string }[];
}

/** Their role ids in one server, or null if they're not a member. */
export async function fetchMyRoles(token: string, guildId: string) {
  const res = await fetch(`${API}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return ((await res.json()) as { roles?: string[] }).roles ?? [];
}

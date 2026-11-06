/**
 * What site admins see about a community's linked Discord server (owner,
 * 6 Nov): all of it is what Discord tells the organiser who linked it, with
 * no bot. Safe for the browser.
 */

/** Discord ids carry their creation time: ms since 2015-01-01 in the top bits. */
const DISCORD_EPOCH = 1_420_070_400_000n;

/** When a Discord server was created, read from its id (null if it isn't one). */
export function discordCreatedAt(id: string): Date | null {
  if (!/^\d{17,20}$/.test(id)) return null;
  return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));
}

/** A server made this recently is worth a look before trusting it. */
export const NEW_SERVER_DAYS = 30;

export function isNewServer(id: string, now = new Date()) {
  const created = discordCreatedAt(id);
  return !!created && now.getTime() - created.getTime() < NEW_SERVER_DAYS * 24 * 3600_000;
}

export function discordIconUrl(id: string, hash: string | null, size = 64) {
  return hash ? `https://cdn.discordapp.com/icons/${id}/${hash}.png?size=${size}` : null;
}

/** The server features worth knowing about, and how to say them. */
export const DISCORD_FEATURES = {
  PARTNERED: "Discord Partner",
  VERIFIED: "Verified",
  DISCOVERABLE: "In Server Discovery",
  COMMUNITY: "Community server",
  VANITY_URL: "Custom invite link",
} as const;
export type DiscordFeature = keyof typeof DISCORD_FEATURES;

export const notableFeatures = (features: readonly string[] | null | undefined) =>
  (features ?? []).filter((f): f is DiscordFeature => f in DISCORD_FEATURES);

/** How the organiser who linked it runs the server. */
export const DISCORD_ROLES = {
  OWNER: "its owner",
  ADMIN: "an admin",
  MANAGER: "a server manager",
} as const;
export type DiscordRole = keyof typeof DISCORD_ROLES;

/** The Group columns site admins' server summary is made from. */
export const discordSummarySelect = {
  discordGuildId: true,
  discordGuildName: true,
  discordIcon: true,
  discordMemberCount: true,
  discordOnlineCount: true,
  discordFeatures: true,
  discordLinkedBy: true,
  discordLinkedAt: true,
  discordCheckedAt: true,
} as const;

type SummaryRow = {
  discordGuildId: string | null;
  discordGuildName: string | null;
  discordIcon: string | null;
  discordMemberCount: number | null;
  discordOnlineCount: number | null;
  discordFeatures: string | null;
  discordLinkedBy: string | null;
  discordLinkedAt: Date | null;
  discordCheckedAt: Date | null;
};

/** Everything site admins see about a group's linked server, or null. */
export function discordSummary(g: SummaryRow, now = new Date()) {
  if (!g.discordGuildId) return null;
  return {
    id: g.discordGuildId,
    name: g.discordGuildName,
    icon: discordIconUrl(g.discordGuildId, g.discordIcon),
    members: g.discordMemberCount,
    online: g.discordOnlineCount,
    features: notableFeatures(g.discordFeatures?.split(",")),
    linkedBy: g.discordLinkedBy && g.discordLinkedBy in DISCORD_ROLES ? (g.discordLinkedBy as DiscordRole) : null,
    createdAt: discordCreatedAt(g.discordGuildId),
    isNew: isNewServer(g.discordGuildId, now),
    linkedAt: g.discordLinkedAt,
    checkedAt: g.discordCheckedAt,
  };
}
export type DiscordSummary = NonNullable<ReturnType<typeof discordSummary>>;

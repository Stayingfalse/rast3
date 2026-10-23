import { randomBytes } from "node:crypto";
import type { AffiliateSettings, PrismaClient } from "@prisma/client";

import { seasonYearOf } from "~/server/stamps";

/**
 * Amazon Associates links (20 Oct 2026). Rules we follow (Associates
 * operating agreement and policies):
 * - tagged links only on public pages (the gift page), never behind a login,
 *   and the referring page address is sent, not hidden;
 * - the disclosure sits next to every tagged link;
 * - the page around a link has its own content (not a bare redirect);
 * - no rewards for using a link, and no commission sharing.
 * Site admins switch it on per kind of group or per group; each group can
 * have its own tracking ID per season, otherwise the account's default.
 */

export const AMAZON_DISCLOSURE =
  "As an Amazon Associate, Random Acts of Santa earns from qualifying purchases.";

/**
 * Real tracking IDs only go out on the site registered with Amazon. Dev,
 * previews and local runs get a dummy ID, so no live tag ever appears on an
 * unregistered site (compliance pass, 20 Oct).
 */
export const LIVE_HOSTS = ["raosanta.uk", "www.raosanta.uk"];

/**
 * The Amazon stores we hold Associates accounts for (UK 20 Oct, US 23 Oct
 * 2026). A tracking ID belongs to one store, told by its ending. Lists on
 * any other store open untagged.
 */
export const STORES = {
  uk: { domain: "amazon.co.uk", suffix: "-21", test: "raosantatest-21", name: "Amazon.co.uk" },
  us: { domain: "amazon.com", suffix: "-20", test: "raosantatest-20", name: "Amazon.com" },
} as const;
export type Store = keyof typeof STORES;
export const STORE_KEYS = Object.keys(STORES) as Store[];
export type StoreTags = Record<Store, string>;

/** UK IDs end in -21, US IDs in -20. */
export const TRACKING_ID = /^[a-z0-9][a-z0-9-]{1,38}-2[01]$/;
export const TRACKING_ID_HINT = "Tracking IDs end in -21 (Amazon.co.uk) or -20 (Amazon.com)";

export const storeOfTag = (tag: string): Store | null =>
  STORE_KEYS.find((k) => tag.endsWith(STORES[k].suffix)) ?? null;

/** The store a wishlist is on, if we can tag it. */
export function storeOfUrl(url: string): Store | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return STORE_KEYS.find((k) => STORES[k].domain === host) ?? null;
  } catch {
    return null;
  }
}

/** The real ID on raosanta.uk; anywhere else that store's dummy ID. */
export function tagForHost(tag: string, host: string | null | undefined) {
  const name = (host ?? "").split(",")[0]!.trim().toLowerCase().replace(/:\d+$/, "");
  return LIVE_HOSTS.includes(name) ? tag : STORES[storeOfTag(tag) ?? "uk"].test;
}

type Db = Pick<PrismaClient, "affiliateSettings" | "affiliateTag" | "group" | "giftPage">;

const DEFAULTS: Omit<AffiliateSettings, "updatedAt"> = {
  id: "site",
  enabled: false,
  defaultTag: "raosanta04-21",
  defaultTagUs: "raosanta-20",
  orgDefault: false,
  communityDefault: true,
  friendsDefault: true,
};

export async function getAffiliateSettings(db: Db) {
  return (await db.affiliateSettings.findUnique({ where: { id: "site" } })) ?? DEFAULTS;
}

export type Affiliate = { enabled: false } | { enabled: true; tags: StoreTags };

/**
 * Whether wishlists picked up in this group use affiliate links this season,
 * and with which tracking ID. Teams follow their workplace.
 */
export async function affiliateFor(
  db: Db,
  groupId: string,
  season = seasonYearOf(new Date()),
  settings?: Awaited<ReturnType<typeof getAffiliateSettings>>,
): Promise<Affiliate> {
  const s = settings ?? (await getAffiliateSettings(db));
  if (!s.enabled) return { enabled: false };
  const found = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      kind: true,
      affiliate: true,
      parent: { select: { id: true, kind: true, affiliate: true } },
    },
  });
  const group = found?.kind === "TEAM" ? found.parent : found;
  if (!group) return { enabled: false };

  const byKind =
    group.kind === "ORG"
      ? s.orgDefault
      : group.kind === "COMMUNITY"
        ? s.communityDefault
        : s.friendsDefault;
  const on = group.affiliate === "DEFAULT" ? byKind : group.affiliate === "ON";
  if (!on) return { enabled: false };

  const own = await db.affiliateTag.findMany({
    where: { groupId: group.id, season },
    select: { tag: true, store: true },
  });
  const ownTag = (store: Store) => own.find((t) => t.store === store.toUpperCase())?.tag;
  return {
    enabled: true,
    tags: { uk: ownTag("uk") ?? s.defaultTag, us: ownTag("us") ?? s.defaultTagUs },
  };
}

/**
 * The wishlist address with this group's tracking ID for its store added,
 * or null for a store we have no Associates account for (any store is
 * accepted since 22 Oct; UK and US are tagged).
 */
export function taggedUrl(wishlistUrl: string, tags: StoreTags): string | null {
  const store = storeOfUrl(wishlistUrl);
  if (!store) return null;
  const url = new URL(wishlistUrl);
  url.searchParams.set("tag", tags[store]);
  return url.toString();
}

/**
 * The fixed gift page for this wishlist, group and season (made on first
 * use). It keeps the wishlist link it was made for (owner, 20 Oct); if the
 * owner swaps lists during the season, this season's page follows them.
 */
export async function giftPageFor(
  db: Db,
  ownerId: string,
  groupId: string,
  wishlistUrl: string,
  season = seasonYearOf(new Date()),
) {
  const where = { ownerId_groupId_season: { ownerId, groupId, season } };
  const existing = await db.giftPage.findUnique({
    where,
    select: { id: true, wishlistUrl: true },
  });
  if (existing) {
    if (existing.wishlistUrl !== wishlistUrl) {
      await db.giftPage.update({ where: { id: existing.id }, data: { wishlistUrl } });
    }
    return existing.id;
  }
  const created = await db.giftPage.upsert({
    where,
    update: {},
    create: {
      id: randomBytes(16).toString("base64url"),
      ownerId,
      groupId,
      season,
      wishlistUrl,
    },
    select: { id: true },
  });
  return created.id;
}

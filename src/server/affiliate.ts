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
export const TEST_TAG = "raosantatest-21";

export function tagForHost(tag: string, host: string | null | undefined) {
  const name = (host ?? "").split(",")[0]!.trim().toLowerCase().replace(/:\d+$/, "");
  return LIVE_HOSTS.includes(name) ? tag : TEST_TAG;
}

/** Amazon.co.uk tracking IDs end in -21. */
export const TRACKING_ID = /^[a-z0-9][a-z0-9-]{1,38}-21$/;

type Db = Pick<PrismaClient, "affiliateSettings" | "affiliateTag" | "group" | "giftPage">;

const DEFAULTS: Omit<AffiliateSettings, "updatedAt"> = {
  id: "site",
  enabled: false,
  defaultTag: "raosanta04-21",
  orgDefault: false,
  communityDefault: true,
  friendsDefault: true,
};

export async function getAffiliateSettings(db: Db) {
  return (await db.affiliateSettings.findUnique({ where: { id: "site" } })) ?? DEFAULTS;
}

export type Affiliate = { enabled: false } | { enabled: true; tag: string };

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

  const own = await db.affiliateTag.findUnique({
    where: { groupId_season: { groupId: group.id, season } },
    select: { tag: true },
  });
  return { enabled: true, tag: own?.tag ?? s.defaultTag };
}

/** The wishlist address with the tracking ID added (Amazon.co.uk only). */
export function taggedUrl(wishlistUrl: string, tag: string): string | null {
  try {
    const url = new URL(wishlistUrl);
    if (url.hostname !== "www.amazon.co.uk") return null;
    url.searchParams.set("tag", tag);
    return url.toString();
  } catch {
    return null;
  }
}

/** The fixed gift page for this wishlist, group and season (made on first use). */
export async function giftPageFor(
  db: Db,
  ownerId: string,
  groupId: string,
  season = seasonYearOf(new Date()),
) {
  const where = { ownerId_groupId_season: { ownerId, groupId, season } };
  const existing = await db.giftPage.findUnique({ where, select: { id: true } });
  if (existing) return existing.id;
  const created = await db.giftPage.upsert({
    where,
    update: {},
    create: { id: randomBytes(16).toString("base64url"), ownerId, groupId, season },
    select: { id: true },
  });
  return created.id;
}

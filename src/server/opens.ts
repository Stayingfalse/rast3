import type { PrismaClient } from "@prisma/client";

import { affiliateFor, storeOfUrl, taggedUrl } from "~/server/affiliate";
import { getWorkplace } from "~/server/groups";
import { currentSeason } from "~/server/season";
import { cleanWishlistUrl } from "~/lib/wishlist";

/**
 * Wishlist opens (owner, 23 Oct 2026): counted on our own server when a
 * link to Amazon is clicked, with no cookies and no third parties. Each
 * open notes the Amazon store and whether it could carry our tag, so the
 * admin report shows which stores we'd earn on with another Associates
 * account.
 */

/** "amazon.de" for a wishlist on amazon.de; "other" for anything else. */
export function storeDomain(url: string | null | undefined): string {
  try {
    const host = new URL(url ?? "").hostname.replace(/^(www|smile)\./, "");
    return /^amazon\.[a-z.]+$/.test(host) ? host.slice(0, 32) : "other";
  } catch {
    return "other";
  }
}

/** The same click arriving twice (double click, retried beacon) counts once. */
const DEDUPE_MS = 30_000;

async function recent(db: PrismaClient, where: { assignmentId?: string; giftPageId?: string }) {
  return db.wishlistOpen.count({
    where: { ...where, createdAt: { gte: new Date(Date.now() - DEDUPE_MS) } },
  });
}

/** A picked-up list opened straight on Amazon from the holder's parcel. */
export async function recordParcelOpen(db: PrismaClient, userId: string, assignmentId: string) {
  const a = await db.wishlistAssignment.findFirst({
    where: { id: assignmentId, assignedUserId: userId },
    select: { groupId: true, wishlistOwner: { select: { amazonWishlistUrl: true } } },
  });
  if (!a || (await recent(db, { assignmentId }))) return false;
  const url = a.wishlistOwner.amazonWishlistUrl ? cleanWishlistUrl(a.wishlistOwner.amazonWishlistUrl) : null;
  const groupId = a.groupId ?? (await getWorkplace(db, userId)).org?.group.id ?? null;
  const on = groupId ? (await affiliateFor(db, groupId)).enabled : false;
  // with links on and a store we can tag, the parcel opens the gift page,
  // which counts the open itself when its Amazon button is clicked
  if (on && url && storeOfUrl(url)) return false;
  await db.wishlistOpen.create({
    data: {
      season: currentSeason(),
      store: storeDomain(url),
      affiliateOn: on,
      tagged: false,
      viaGiftPage: false,
      assignmentId,
      groupId,
    },
  });
  return true;
}

/** A list opened on Amazon from its public gift page. */
export async function recordGiftPageOpen(db: PrismaClient, token: string) {
  const page = await db.giftPage.findUnique({
    where: { id: token },
    select: { id: true, season: true, groupId: true, wishlistUrl: true, owner: { select: { amazonWishlistUrl: true } } },
  });
  if (!page || (await recent(db, { giftPageId: page.id }))) return false;
  const url = page.wishlistUrl ?? page.owner?.amazonWishlistUrl ?? null;
  const affiliate = await affiliateFor(db, page.groupId, page.season);
  await db.wishlistOpen.create({
    data: {
      season: page.season,
      store: storeDomain(url),
      affiliateOn: affiliate.enabled,
      tagged: !!(url && affiliate.enabled && taggedUrl(url, affiliate.tags)),
      viaGiftPage: true,
      giftPageId: page.id,
      groupId: page.groupId,
    },
  });
  return true;
}

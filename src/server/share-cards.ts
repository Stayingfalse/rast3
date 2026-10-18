import { randomBytes } from "node:crypto";

import { db } from "~/server/db";
import { seasonYearOf } from "~/server/stamps";

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random 10-character share code (no look-alike characters). */
export function newShareCode(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type ShareKind = "sent" | "thanks";

export const sharePath = (kind: ShareKind, code: string) => `/${kind}/${code}`;

export interface PublicShareCard {
  code: string;
  kind: ShareKind;
  season: number;
  /** Thank-you message (thanks cards only) */
  message: string | null;
  /** Stored image URLs (thanks cards only) */
  images: string[];
}

/**
 * The public view of a share card: only what the sharer chose to show.
 * Never includes names, departments, the gift, or anything identifying the
 * recipient. Hidden (moderated) thank-yous are not shown.
 */
export async function getPublicShareCard(
  code: string,
  kind: ShareKind,
): Promise<PublicShareCard | null> {
  if (!/^[A-Za-z0-9]{6,20}$/.test(code)) return null;
  const card = await db.shareCard.findUnique({
    where: { id: code },
    include: {
      purchase: { select: { purchasedAt: true } },
      kudos: {
        select: { message: true, images: true, hidden: true, createdAt: true },
      },
    },
  });
  if (!card) return null;

  if (kind === "sent" && card.kind === "SENT" && card.purchase) {
    return {
      code,
      kind,
      season: seasonYearOf(card.purchase.purchasedAt),
      message: null,
      images: [],
    };
  }
  if (kind === "thanks" && card.kind === "THANKS" && card.kudos) {
    if (card.kudos.hidden) return null;
    let images: string[] = [];
    try {
      const parsed: unknown = JSON.parse(card.kudos.images);
      if (Array.isArray(parsed))
        images = parsed.filter((u): u is string => typeof u === "string");
    } catch {
      images = [];
    }
    return {
      code,
      kind,
      season: seasonYearOf(card.kudos.createdAt),
      message: card.kudos.message,
      images,
    };
  }
  return null;
}

export async function countShareView(code: string) {
  await db.shareCard
    .update({ where: { id: code }, data: { views: { increment: 1 } } })
    .catch(() => undefined);
}

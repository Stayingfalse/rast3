import { randomBytes } from "node:crypto";

import { db } from "~/server/db";
import { roundForPublic } from "~/server/public-stats";
import { seasonRange, seasonYearOf } from "~/server/stamps";

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random 10-character share code (no look-alike characters). */
export function newShareCode(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type ShareKind = "sent" | "thanks" | "team";

export const sharePath = (kind: ShareKind, code: string) => `/${kind}/${code}`;

export interface PublicShareCard {
  code: string;
  kind: ShareKind;
  season: number;
  /** Thank-you message (thanks cards only) */
  message: string | null;
  /** Stored image URLs (thanks cards only) */
  images: string[];
  /** Live, rounded season totals (team cards only) */
  group: GroupTotals | null;
}

export type GroupScope = "org" | "team";

export interface GroupTotals {
  scope: GroupScope;
  label: string;
  /** Rounded for public display ("120+"); null when under 10 */
  gifts: string | null;
  thanks: string | null;
  members: string | null;
}

export const groupKeyOf = (scope: GroupScope, id: string) => `${scope}:${id}`;

/**
 * This season's totals for an organisation (email domain) or a team
 * (department), rounded like the public totals so small groups can't be
 * picked apart.
 */
export async function groupTotals(
  scope: GroupScope,
  id: string,
  label: string,
  season: number = seasonYearOf(new Date()),
): Promise<GroupTotals> {
  // Members by group (Day 9); ids stay the email domain / department id so
  // existing card links keep working
  const who = {
    memberships: {
      some: {
        group: scope === "org" ? { emailDomain: id } : { departmentId: id },
      },
    },
  };
  const range = seasonRange(season);
  const [gifts, thanks, members] = await Promise.all([
    db.purchase.count({ where: { user: who, purchasedAt: range } }),
    db.kudos.count({ where: { user: who, hidden: false, createdAt: range } }),
    db.user.count({ where: { ...who, profileCompleted: true } }),
  ]);
  return {
    scope,
    label,
    gifts: roundForPublic(gifts),
    thanks: roundForPublic(thanks),
    members: roundForPublic(members),
  };
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
      group: null,
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
      group: null,
    };
  }
  if (
    kind === "team" &&
    (card.kind === "ORG" || card.kind === "TEAM") &&
    card.groupKey
  ) {
    const [scope, ...rest] = card.groupKey.split(":");
    const id = rest.join(":");
    if ((scope !== "org" && scope !== "team") || !id) return null;
    const season = seasonYearOf(new Date());
    const group = await groupTotals(
      scope,
      id,
      card.label ?? "Our team",
      season,
    );
    // Too few gifts to show yet: the card stays private until there are.
    if (!group.gifts) return null;
    return { code, kind, season, message: null, images: [], group };
  }
  return null;
}

export async function countShareView(code: string) {
  await db.shareCard
    .update({ where: { id: code }, data: { views: { increment: 1 } } })
    .catch(() => undefined);
}

import { randomBytes } from "node:crypto";

import { db } from "~/server/db";
import { checkedIn } from "~/server/season";
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
  /**
   * Who the gift went to, by the kind of group it was picked up in (sent
   * cards; 27 Nov: a Discord or friends gift said "a colleague").
   */
  recipient: Recipient;
}

export type Recipient = "colleague" | "member" | "friend";
const recipientOf = (kind: string | null | undefined): Recipient =>
  kind === "COMMUNITY" ? "member" : kind === "FRIENDS" ? "friend" : "colleague";

/** "A colleague", "A community member", "A friend" */
export const recipientLabel: Record<Recipient, string> = {
  colleague: "A colleague",
  member: "A community member",
  friend: "A friend",
};

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
 * This season's totals for a workplace or a team (by group id), rounded like
 * the public totals so small groups can't be picked apart.
 */
export async function groupTotals(
  scope: GroupScope,
  id: string,
  label: string,
  season: number = seasonYearOf(new Date()),
): Promise<GroupTotals> {
  // Members by group; card keys were moved onto group ids on 20 Oct
  const who = { memberships: { some: { groupId: id } } };
  const range = seasonRange(season);
  const [gifts, thanks, members] = await Promise.all([
    db.purchase.count({ where: { user: who, purchasedAt: range } }),
    db.kudos.count({ where: { user: who, hidden: false, createdAt: range } }),
    // this season's: checked in for it, not everyone who ever joined (owner, 19 Nov)
    db.user.count({ where: { ...who, profileCompleted: true, ...checkedIn(season) } }),
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
      purchase: {
        select: { purchasedAt: true, wishlistAssignment: { select: { group: { select: { kind: true } } } } },
      },
      kudos: {
        select: {
          message: true,
          images: true,
          hidden: true,
          createdAt: true,
          purchase: { select: { wishlistAssignment: { select: { group: { select: { kind: true } } } } } },
        },
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
      recipient: recipientOf(card.purchase.wishlistAssignment?.group?.kind),
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
      recipient: recipientOf(card.kudos.purchase?.wishlistAssignment?.group?.kind),
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
    return { code, kind, season, message: null, images: [], group, recipient: "colleague" };
  }
  return null;
}

export async function countShareView(code: string) {
  await db.shareCard
    .update({ where: { id: code }, data: { views: { increment: 1 } } })
    .catch(() => undefined);
}

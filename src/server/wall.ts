import { TRPCError } from "@trpc/server";
import type { GroupKind, Prisma } from "@prisma/client";

import type { db as Db } from "~/server/db";
import { getChristmasIdentity } from "~/lib/festive-name";
import { roundForPublic } from "~/server/public-stats";
import { groupFeed, inGroup } from "~/server/scope";
import { seasonRange, seasonYearOf } from "~/server/stamps";

/**
 * Day 34: the Wall of Kindness. A group's thank-yous on one public page and
 * one image, for organisers to post on Discord, Slack or LinkedIn. Posters
 * appear under their festive names only: never a real name, an email, which
 * gift it was, or a photo. Hidden (moderated) thank-yous never appear.
 * It is live, so it works "so far" during the season and as the recap after.
 */

/** A group needs this many visible thank-yous before it can have a wall. */
export const WALL_MIN_THANKS = 3;
/** Thank-yous shown on the page, newest first. */
const WALL_NOTES = 12;

export const wallKeyOf = (groupId: string) => `wall:${groupId}`;
export const wallPath = (code: string) => `/wall/${code}`;

type Group = { id: string; kind: GroupKind };

/**
 * The thank-yous that belong to a group this season, visible ones only.
 * Friends and community groups use their own feed (thank-yous for gifts given
 * in the group, plus members' general ones); workplaces and teams use their
 * members' thank-yous, like the Team and Organisation feeds.
 */
export function wallThanks(
  group: Group,
  season = seasonYearOf(new Date()),
): Prisma.KudosWhereInput {
  const scope =
    group.kind === "FRIENDS" || group.kind === "COMMUNITY"
      ? groupFeed(group.id)
      : { user: inGroup(group.id) };
  return { AND: [scope, { hidden: false, createdAt: seasonRange(season) }] };
}

/** Gifts sent this season: in the group, or (workplaces) by its members. */
function wallGifts(
  group: Group,
  season = seasonYearOf(new Date()),
): Prisma.PurchaseWhereInput {
  const range = seasonRange(season);
  return group.kind === "FRIENDS" || group.kind === "COMMUNITY"
    ? { wishlistAssignment: { groupId: group.id }, purchasedAt: range }
    : { user: inGroup(group.id), purchasedAt: range };
}

/** Live and approved: the group, and a team's workplace, are ACTIVE. */
const isLive = (g: {
  status: string;
  parent: { status: string } | null;
}) => g.status === "ACTIVE" && (g.parent ? g.parent.status === "ACTIVE" : true);

/**
 * The group, if this person may make its wall: its organisers (a team's
 * workplace organisers too) or a site admin. Throws otherwise.
 */
export async function requireWallOrganiser(
  db: typeof Db,
  userId: string,
  groupId: string,
) {
  const [group, me] = await Promise.all([
    db.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        kind: true,
        name: true,
        status: true,
        parentId: true,
        parent: { select: { status: true } },
      },
    }),
    db.user.findUnique({ where: { id: userId }, select: { adminLevel: true } }),
  ]);
  if (!group) throw new TRPCError({ code: "NOT_FOUND" });
  const roles = await db.membership.findMany({
    where: {
      userId,
      role: "ADMIN",
      groupId: { in: [group.id, ...(group.parentId ? [group.parentId] : [])] },
    },
    select: { groupId: true },
  });
  if (me?.adminLevel !== "SITE" && roles.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Organisers only" });
  }
  return group;
}

/** For the organiser: how close the group is to a wall, and its link. */
export async function wallStatus(db: typeof Db, group: Group & {
  status: string;
  parent: { status: string } | null;
}) {
  const [thanks, card] = await Promise.all([
    db.kudos.count({ where: wallThanks(group) }),
    db.shareCard.findUnique({
      where: { groupKey: wallKeyOf(group.id) },
      select: { id: true, label: true },
    }),
  ]);
  return {
    thanks,
    live: isLive(group),
    ready: isLive(group) && thanks >= WALL_MIN_THANKS,
    label: card?.label ?? null,
    path: card ? wallPath(card.id) : null,
  };
}

export interface PublicWall {
  code: string;
  season: number;
  label: string;
  /** Rounded like the public totals ("120+"); null under 10 */
  thanks: string | null;
  gifts: string | null;
  /** Newest first: the message and the poster's festive name, nothing else */
  notes: { name: string; message: string }[];
}

/**
 * The public view of a wall. Null (not found) unless the group is live and
 * still has enough visible thank-yous this season.
 */
export async function getPublicWall(
  db: typeof Db,
  code: string,
): Promise<PublicWall | null> {
  if (!/^[A-Za-z0-9]{6,20}$/.test(code)) return null;
  const card = await db.shareCard.findUnique({
    where: { id: code },
    select: { kind: true, groupKey: true, label: true },
  });
  if (card?.kind !== "WALL" || !card.groupKey?.startsWith("wall:")) return null;
  const group = await db.group.findUnique({
    where: { id: card.groupKey.slice("wall:".length) },
    select: {
      id: true,
      kind: true,
      name: true,
      status: true,
      parent: { select: { status: true } },
    },
  });
  if (!group || !isLive(group)) return null;

  const season = seasonYearOf(new Date());
  const where = wallThanks(group, season);
  const [thanks, gifts, notes] = await Promise.all([
    db.kudos.count({ where }),
    db.purchase.count({ where: wallGifts(group, season) }),
    db.kudos.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: WALL_NOTES,
      // only what the wall shows: never the gift, photos or the poster's name
      select: { userId: true, message: true },
    }),
  ]);
  if (thanks < WALL_MIN_THANKS) return null;
  return {
    code,
    season,
    label: card.label ?? group.name,
    thanks: roundForPublic(thanks),
    gifts: roundForPublic(gifts),
    notes: notes.map((n) => ({
      name: getChristmasIdentity(n.userId).name,
      message: n.message.trim(),
    })),
  };
}

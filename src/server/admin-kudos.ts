import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Admin › Kudos (owner, 27 Nov): every thank-you on the site for moderation,
 * not the public feed's 30. Search the message or the author; filter by any
 * group (a thank-you belongs to the group its gift was picked up in, or to
 * the author's workplace and team); show visible, hidden or with photos.
 */
export const KUDOS_SHOW = ["all", "visible", "hidden", "photos"] as const;
export type KudosShow = (typeof KUDOS_SHOW)[number];
const LIMIT = 200;

const nameOf = (u: { firstName: string | null; lastName: string | null; name: string | null; email: string | null }) => {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full !== "" ? full : (u.name ?? u.email ?? "(no name)");
};
const photosOf = (json: string) => {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
};

export async function adminKudos(db: PrismaClient, input: { q: string; groupId: string | null; show: KudosShow }) {
  const q = input.q.trim();
  const where: Prisma.KudosWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { message: { contains: q } },
              { user: { firstName: { contains: q } } },
              { user: { lastName: { contains: q } } },
              { user: { email: { contains: q } } },
            ],
          }
        : {},
      input.groupId
        ? {
            OR: [
              { purchase: { wishlistAssignment: { groupId: input.groupId } } },
              // workplace thank-yous have no group on the gift: the author's workplace or team
              { purchase: { wishlistAssignment: { groupId: null } }, user: { memberships: { some: { groupId: input.groupId } } } },
            ],
          }
        : {},
      input.show === "visible" ? { hidden: false } : input.show === "hidden" ? { hidden: true } : {},
      input.show === "photos" ? { NOT: { images: { in: ["", "[]"] } } } : {},
    ],
  };
  const [total, hidden, rows] = await Promise.all([
    db.kudos.count({ where }),
    db.kudos.count({ where: { AND: [where, { hidden: true }] } }),
    db.kudos.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        message: true,
        images: true,
        createdAt: true,
        hidden: true,
        moderatedAt: true,
        moderator: { select: { firstName: true, lastName: true, name: true, email: true } },
        user: { select: { firstName: true, lastName: true, name: true, email: true } },
        purchase: { select: { wishlistAssignment: { select: { group: { select: { name: true, kind: true } } } } } },
      },
    }),
  ]);
  return {
    total,
    hidden,
    limited: total > LIMIT,
    rows: rows.map((k) => ({
      id: k.id,
      message: k.message,
      photos: photosOf(k.images),
      createdAt: k.createdAt,
      hidden: k.hidden,
      moderated: k.moderatedAt ? { at: k.moderatedAt, by: k.moderator ? nameOf(k.moderator) : null } : null,
      author: { name: nameOf(k.user), email: k.user.email },
      group: k.purchase?.wishlistAssignment.group ?? null,
    })),
  };
}

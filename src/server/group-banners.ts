import type { PrismaClient } from "@prisma/client";

import { inviteLink } from "~/lib/invite-message";
import { launchOf } from "~/server/group-launch";
import { roundForPublic } from "~/server/public-stats";
import { seasonWindow } from "~/server/season";
import { seasonRange } from "~/server/stamps";

/**
 * Promotional banners for a group (owner, 17 Nov): the Sensee example made
 * programmatic, so any workplace, community or friends group's organisers
 * can download a set from their console. Standard web sizes.
 */
export { BANNER_SIZES, isBannerSize, type BannerSize } from "~/lib/banner-sizes";

export type BannerData = {
  season: number;
  /** "colleagues", "members" or "friends" */
  people: string;
  /** one of them, for "pick up a colleague's" */
  person: string;
  /** the small banners' button: "Join your colleagues" */
  cta: string;
  /** "Everyone @sensee.co.uk" or "Everyone in <group>" */
  to: string;
  /** the join link without https://, e.g. raosanta.uk/sensee.co.uk */
  link: string;
  /** "Opens Fri 27 November" or "Open now until Wed 6 January" */
  posting: string;
  /** the short form for small sizes: "Opens Fri 27 Nov" */
  postingShort: string;
  /** "130+ joined in last year": only when that rounds to 10 or more */
  proof: string | null;
};

const ukDate = (d: Date, month: "long" | "short") =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month, timeZone: "Europe/London" });

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** What a group's banners say. Counts are rounded as on the public pages. */
export async function bannerData(
  db: PrismaClient,
  group: {
    id: string;
    kind: string;
    name: string;
    emailDomain: string | null;
    joinCode: string | null;
    launchAt: Date | null;
    launchSeason: number | null;
  },
  origin: string,
  now = new Date(),
): Promise<BannerData> {
  const w = await seasonWindow(db);
  const opensAt = launchOf(group, w);
  const people = group.kind === "ORG" ? "colleagues" : group.kind === "FRIENDS" ? "friends" : "members";
  const person = group.kind === "ORG" ? "colleague" : group.kind === "FRIENDS" ? "friend" : "member";

  // members who were already in before this season started: "last year"
  // (this season's numbers are too early to boast about; owner, 17 Nov)
  const returning = await db.membership.count({
    where: { groupId: group.id, joinedAt: { lt: seasonRange(w.year).gte } },
  });
  const proofCount = roundForPublic(returning);

  const before = now < opensAt;
  const closed = now > w.closesAt;
  return {
    season: w.year,
    people,
    person,
    cta: group.kind === "ORG" ? "Join your colleagues" : group.kind === "FRIENDS" ? "Join your friends" : "Join the community",
    to:
      group.kind === "ORG" && group.emailDomain
        ? `Everyone @${group.emailDomain}`
        : `Everyone in ${clip(group.name, 28)}`,
    link: inviteLink(group, origin).replace(/^https?:\/\//, ""),
    posting: closed
      ? "Back next November"
      : before
        ? `Opens ${ukDate(opensAt, "long")}`
        : `Open now until ${ukDate(w.closesAt, "long")}`,
    postingShort: closed
      ? "Back next November"
      : before
        ? `Opens ${ukDate(opensAt, "short")}`
        : `Open until ${ukDate(w.closesAt, "short")}`,
    proof: proofCount ? `${proofCount} joined in last year` : null,
  };
}

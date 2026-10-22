import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe links (22 Oct): signed with AUTH_SECRET, so a link only ever
 * changes its own person's reminders and needs no sign-in.
 */
const sign = (userId: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "raosanta-dev")
    .update(`unsubscribe:${userId}`)
    .digest("base64url")
    .slice(0, 32);

export const unsubscribeToken = sign;

export function validUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Where the site lives, for links in emails. */
export const siteUrl = () => (process.env.AUTH_URL ?? "https://raosanta.uk").replace(/\/$/, "");

export const unsubscribeUrl = (userId: string) =>
  `${siteUrl()}/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

/** The one-click address mail apps POST to (List-Unsubscribe-Post). */
export const oneClickUrl = (userId: string) =>
  `${siteUrl()}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

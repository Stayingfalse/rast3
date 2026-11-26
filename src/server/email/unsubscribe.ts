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

/**
 * Where the site lives, for links in emails: the origin only (26 Nov).
 * AUTH_URL is Auth.js's address, https://raosanta.uk/api/auth, so using it
 * whole sent every email button and "stop reminder emails" link to
 * /api/auth/..., which Auth.js answers with an error.
 */
export const siteUrl = () => {
  try {
    return new URL(process.env.AUTH_URL ?? "https://raosanta.uk").origin;
  } catch {
    return "https://raosanta.uk";
  }
};

export const unsubscribeUrl = (userId: string) =>
  `${siteUrl()}/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

/** The one-click address mail apps POST to (List-Unsubscribe-Post). */
export const oneClickUrl = (userId: string) =>
  `${siteUrl()}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

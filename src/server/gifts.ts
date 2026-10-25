import { createHmac, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Day 26: gift-received confirmation. The person a gift was for can say it
 * arrived, so their Santa knows it landed without anyone writing anything.
 * They only hear a gift is on its way a few days after it was marked (the
 * same wait as the check-in email), so the surprise is kept (owner, 22 Oct).
 */
export const ARRIVAL_AFTER_DAYS = 4;
const DAY = 24 * 3600_000;

/** Gifts marked before this can be shown to the person they were for. */
export const showableBefore = (now = new Date()) => new Date(now.getTime() - ARRIVAL_AFTER_DAYS * DAY);

/** Signed "it arrived" links in the check-in email: no sign-in needed. */
const sign = (purchaseId: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "raosanta-dev")
    .update(`arrived:${purchaseId}`)
    .digest("base64url")
    .slice(0, 32);

export const arrivalToken = sign;

export function validArrival(purchaseId: string, token: string) {
  const a = Buffer.from(sign(purchaseId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const arrivalPath = (purchaseId: string) =>
  `/arrived?p=${encodeURIComponent(purchaseId)}&t=${arrivalToken(purchaseId)}`;

/** Marks a gift as arrived (the first time only); true if it's now marked. */
export async function markArrived(db: Pick<PrismaClient, "purchase">, purchaseId: string) {
  await db.purchase.updateMany({
    where: { id: purchaseId, receivedAt: null },
    data: { receivedAt: new Date() },
  });
  return !!(await db.purchase.findFirst({
    where: { id: purchaseId, receivedAt: { not: null } },
    select: { id: true },
  }));
}

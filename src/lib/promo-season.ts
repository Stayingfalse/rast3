/**
 * Where the season stands, for the promo channel (raosanta.uk on Instagram
 * and YouTube, made by the TechNews-Bot repo): which phase it's in and how
 * many UK calendar days until each date. Pure, so it can be tested on its own.
 */
import { ukYmd } from "~/lib/last-order";

export type SeasonPhase =
  /** before the wishlist drive: the site is a countdown */
  | "off-season"
  /** the wishlist drive: share your list before gifting opens */
  | "drive"
  /** gifting is open */
  | "open"
  /** gifting has closed for this season */
  | "closed";

export interface SeasonDates {
  driveStartsAt: Date;
  opensAt: Date;
  closesAt: Date;
  lastOrderAt: Date | null;
}

/** Whole UK calendar days from `now` to `then` (0 on the day, negative after). */
export function daysUntil(now: Date, then: Date): number {
  return Math.round(
    (Date.parse(`${ukYmd(then)}T00:00:00Z`) -
      Date.parse(`${ukYmd(now)}T00:00:00Z`)) /
      86_400_000,
  );
}

export function seasonPhase(now: Date, d: SeasonDates): SeasonPhase {
  if (now > d.closesAt) return "closed";
  if (now >= d.opensAt) return "open";
  if (now >= d.driveStartsAt) return "drive";
  return "off-season";
}

/** The countdowns a video can quote; null where a date has passed or isn't set. */
export function seasonCountdowns(now: Date, d: SeasonDates) {
  const ahead = (then: Date | null) => {
    if (!then) return null;
    const n = daysUntil(now, then);
    return n >= 0 ? n : null;
  };
  return {
    daysToOpen: ahead(d.opensAt),
    daysToClose: ahead(d.closesAt),
    daysToLastOrder: ahead(d.lastOrderAt),
  };
}

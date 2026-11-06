/**
 * The last-order countdown (owner, 6 Nov 2026): late Santas see how long
 * they have to order for Christmas delivery. The date is Amazon UK's last
 * day for standard Christmas delivery, set by a site admin each season
 * (never hard-coded: it changes every year and per store).
 *
 * Pure, so the server works it out once (season.status) and the page renders
 * exactly what the server sent: no clock-dependent text to mismatch on
 * hydration. Every date is a UK calendar date.
 */

const UK = "Europe/London";

/** The countdown starts on 10 December... */
export const COUNTDOWN_FROM = { month: 12, day: 10 };
/**
 * ...or sooner when the last-order date is early: always at least ten days'
 * notice (the last day included), so an early date never arrives unseen.
 */
export const MIN_NOTICE_DAYS = 9;

export type LastOrderNotice =
  /** date: "Saturday 19 December"; ymd: "2026-12-19" (for the postmark) */
  | { state: "countdown"; date: string; ymd: string; daysLeft: number }
  | { state: "last-day"; date: string; ymd: string }
  | { state: "late" };

/** "2026-12-19": the UK calendar date of an instant. */
export const ukYmd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: UK });

/** Whole days from one yyyy-mm-dd to another. */
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** "Saturday 19 December", in UK time. */
export const lastOrderLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: UK });

/**
 * What a gifting member sees about the last-order date, or null for nothing:
 * - no date set, or gifting isn't open for them: nothing;
 * - from 10 December (or ten days before an earlier date) until the day
 *   before: a countdown;
 * - on the day: "last day";
 * - after it, while gifting stays open: a gentle note that late gifts still
 *   count (kinder than vanishing: a Santa who missed the date might
 *   otherwise think it's too late to bother).
 */
export function lastOrderNotice({
  now,
  lastOrderAt,
  giftingOpen,
}: {
  now: Date;
  lastOrderAt: Date | null;
  giftingOpen: boolean;
}): LastOrderNotice | null {
  if (!lastOrderAt || !giftingOpen) return null;
  const today = ukYmd(now);
  const last = ukYmd(lastOrderAt);
  const daysLeft = daysBetween(today, last);
  if (daysLeft < 0) return { state: "late" };
  const date = lastOrderLabel(lastOrderAt);
  if (daysLeft === 0) return { state: "last-day", date, ymd: last };
  const from = `${last.slice(0, 4)}-${String(COUNTDOWN_FROM.month).padStart(2, "0")}-${String(COUNTDOWN_FROM.day).padStart(2, "0")}`;
  if (today >= from || daysLeft <= MIN_NOTICE_DAYS) return { state: "countdown", date, ymd: last, daysLeft };
  return null;
}

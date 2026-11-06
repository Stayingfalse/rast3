/**
 * UK calendar dates (Europe/London), for dates people pick ("2026-12-01")
 * that mean a whole UK day whatever the clocks are doing.
 */

const parts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );

/** "2026-12-01" for the UK day this instant falls in. */
export function ukDateString(d: Date) {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The instant a UK day starts (midnight UK time), or null if it isn't a date. */
export function ukMidnight(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const utc = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  if (Number.isNaN(utc) || ukDateString(new Date(utc + 12 * 3600_000)) !== date) return null;
  // midnight UTC is 1am in British Summer Time
  return new Date(Number(parts(new Date(utc)).hour) === 1 ? utc - 3600_000 : utc);
}

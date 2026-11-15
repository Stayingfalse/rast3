/**
 * The season's dates as an iCalendar file (owner backlog: "Calendar (.ics)
 * export"; built 15 Nov for the wishlist drive, so people can put the day
 * gifting opens in their diary). All-day events on UK calendar days.
 */
type Window = { year: number; opensAt: Date; closesAt: Date; lastOrderAt: Date | null };

/** "20261127" for the UK calendar day `d` falls on. */
const ukDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/London" }).replaceAll("-", "");
const nextDay = (yyyymmdd: string) => {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1));
  return d.toISOString().slice(0, 10).replaceAll("-", "");
};
/** RFC 5545 text: escape \ ; , and newlines. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** RFC 5545 folds lines longer than 75 octets: CRLF, then a space. */
export function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let part = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    // the first line holds 75 octets; the rest 74 after their leading space
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(part);
      part = "";
      size = 0;
    }
    part += ch;
    size += n;
  }
  parts.push(part);
  return parts.join("\r\n ");
}

export function seasonCalendar(w: Window, origin: string, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const host = new URL(origin).host;
  const event = (key: string, day: Date, summary: string, description: string) => {
    const start = ukDate(day);
    return [
      "BEGIN:VEVENT",
      `UID:${w.year}-${key}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${nextDay(start)}`,
      `SUMMARY:${text(summary)}`,
      `DESCRIPTION:${text(description)}`,
      `URL:${origin}/`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ];
  };
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Random Acts of Santa//Season//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${text(`Random Acts of Santa ${w.year}`)}`,
    ...event(
      "opens",
      w.opensAt,
      "Random Acts of Santa: gifting opens",
      `Pick up someone's wishlist whenever you're ready, as many as you like. No draw, no addresses. ${origin}/`,
    ),
    ...(w.lastOrderAt
      ? event(
          "last-order",
          w.lastOrderAt,
          "Random Acts of Santa: last day to order for Christmas",
          "Amazon UK's last day for standard Christmas delivery.",
        )
      : []),
    ...event(
      "closes",
      w.closesAt,
      "Random Acts of Santa: last day of the season",
      "Post your thank-yous before the season closes.",
    ),
    "END:VCALENDAR",
  ];
  // CRLF line endings, as the format asks
  return lines.map(fold).join("\r\n") + "\r\n";
}

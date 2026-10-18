/**
 * The stamp album: one stamp per Christmas season, collected by marking at
 * least one gift as Gifted or posting a thank-you (kudos) that season.
 *
 * There is no Season model yet (roadmap Week 3), so a season is derived from
 * dates: season Y runs from 1 August Y to 31 July Y+1, which keeps every
 * November-to-January season (and its late thank-yous) inside one year.
 */

/** The first season the site ran; earlier years have no stamp. */
export const FIRST_SEASON = 2025;

/** Seasons with their own stamp artwork in public/brand/stamps/. */
export const STAMP_DESIGNS: Record<number, string> = {
  2025: "The star",
  2026: "The bauble",
};

export function seasonYearOf(date: Date): number {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= 7 ? year : year - 1;
}

/** The [start, end) dates of season Y: 1 August Y to 1 August Y+1 (UTC). */
export function seasonRange(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 7, 1)),
    lt: new Date(Date.UTC(year + 1, 7, 1)),
  };
}

export interface AlbumPage {
  year: number;
  design: string;
  collected: boolean;
  gifts: number;
  thanks: number;
  /** The season being collected now; it can still be earned */
  current: boolean;
}

export function buildAlbum(
  giftDates: Date[],
  thankDates: Date[],
  now: Date = new Date(),
): AlbumPage[] {
  const currentSeason = seasonYearOf(now);
  const count = (dates: Date[]) => {
    const byYear = new Map<number, number>();
    for (const d of dates) {
      const y = seasonYearOf(d);
      byYear.set(y, (byYear.get(y) ?? 0) + 1);
    }
    return byYear;
  };
  const gifts = count(giftDates);
  const thanks = count(thankDates);

  const pages: AlbumPage[] = [];
  for (let year = FIRST_SEASON; year <= currentSeason; year++) {
    const g = gifts.get(year) ?? 0;
    const t = thanks.get(year) ?? 0;
    pages.push({
      year,
      design: STAMP_DESIGNS[year] ?? "Season stamp",
      collected: g + t > 0,
      gifts: g,
      thanks: t,
      current: year === currentSeason,
    });
  }
  return pages;
}

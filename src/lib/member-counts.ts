/**
 * A group's people (owner, 19 Nov): everyone who has ever joined, and how
 * many have checked in this Christmas, so a returning group doesn't quote
 * last year's numbers as this year's. "150 colleagues so far · 23 checked in
 * for Christmas 2026".
 */
export function memberCounts(
  { members, checkedIn, season }: { members: number; checkedIn: number; season: number },
  [one, many]: [string, string],
) {
  return `${members} ${members === 1 ? one : many} so far · ${checkedIn} checked in for Christmas ${season}`;
}

/**
 * Day 20: gift ideas and suggested budgets. Shared by the forms and the
 * server. Ideas are the member's own words (we never read their Amazon list:
 * Associates rules forbid scraping), shown to Santas without a name, and on
 * the public gift page, so no links or contact details.
 */
export const MAX_IDEAS = 5;
export const MAX_IDEA_LENGTH = 80;

/** Links, emails and phone numbers: not allowed in ideas. */
const PERSONAL = /https?:|www\.|\.(?:com|co\.uk|uk|net|org)\b|@|\+?\d[\d ()-]{8,}\d/i;

export const IDEAS_HINT = `Up to ${MAX_IDEAS} short ideas, one per line: things you'd love, sizes, hobbies. Your Santa sees them without your name, so leave out links and contact details.`;

/** Lines from a text box: trimmed, blanks dropped. */
export const ideaLines = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Why these ideas can't be saved, or null when they're fine. */
export function ideasProblem(ideas: string[]): string | null {
  if (ideas.length > MAX_IDEAS) return `Keep it to ${MAX_IDEAS} ideas.`;
  if (ideas.some((i) => i.length > MAX_IDEA_LENGTH))
    return `Keep each idea under ${MAX_IDEA_LENGTH} characters.`;
  if (ideas.some((i) => PERSONAL.test(i)))
    return "Leave out links, emails and phone numbers: ideas are shown without your name.";
  return null;
}

export const BUDGET_BANDS = ["UP_TO_10", "UP_TO_20", "UP_TO_30", "UP_TO_50"] as const;
export type BudgetBand = (typeof BUDGET_BANDS)[number];

export const BUDGET_LABEL: Record<BudgetBand, string> = {
  UP_TO_10: "Up to £10",
  UP_TO_20: "Up to £20",
  UP_TO_30: "Up to £30",
  UP_TO_50: "Up to £50",
};

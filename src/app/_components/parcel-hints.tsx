import { BUDGET_LABEL, type BudgetBand } from "~/lib/gift-ideas";

/**
 * Day 20: on a picked-up wishlist, the group's suggested budget and the
 * owner's own gift ideas (no name). Nothing here comes from Amazon.
 */
export function ParcelHints({
  budget,
  ideas,
}: {
  budget: BudgetBand | null;
  ideas: string[];
}) {
  if (!budget && ideas.length === 0) return null;
  return (
    <div className="text-ink-soft flex flex-col gap-2 text-sm">
      {budget && (
        <p>
          <span className="label-caps text-ink mr-2">Budget</span>
          {BUDGET_LABEL[budget]}, as a guide
        </p>
      )}
      {ideas.length > 0 && (
        <div>
          <p className="label-caps text-ink">Their ideas</p>
          <ul className="text-ink mt-1 flex list-disc flex-col gap-0.5 pl-5">
            {ideas.map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

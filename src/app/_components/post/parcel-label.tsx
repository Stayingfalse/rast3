import { Postmark } from "./postmark";
import { BaubleStamp } from "./stamp";

type Row = { label: string; value: string; hint?: string };

const ROWS: Row[] = [
  { label: "To", value: "A colleague in Finance" },
  { label: "From", value: "Santa" },
  {
    label: "Deliver to",
    value: "Address withheld",
    hint: "Sent through their Amazon wishlist",
  },
  { label: "Contents", value: "One random act of kindness" },
];

type ParcelLabelProps = {
  /** Rounded public total of gifts sent, or null when too small to show */
  gifts: string | null;
};

/**
 * The hero's held moment: a shipping label for a gift whose address nobody
 * ever learns, franked with the live count of gifts sent.
 */
export function ParcelLabel({ gifts }: ParcelLabelProps) {
  return (
    <div className="relative w-full max-w-md rotate-[1.25deg]">
      <figure className="label-stock overflow-hidden">
        <div className="airmail h-2.5" aria-hidden />
        <div className="border-rule flex items-start justify-between gap-4 border-b px-5 pt-4 pb-3">
          <div>
            <p className="label-caps text-ink-soft">Christmas Post</p>
            <p className="font-expanded text-ink mt-1 text-lg leading-tight font-extrabold">
              Random Acts of Santa
            </p>
          </div>
          <BaubleStamp className="h-20 w-16 shrink-0 -rotate-3" />
        </div>
        <dl className="divide-rule divide-y px-5">
          {ROWS.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[6.5rem_1fr] gap-3 py-3"
            >
              <dt className="label-caps text-ink-soft pt-1">{row.label}</dt>
              <dd className="text-ink text-base leading-snug font-semibold">
                {row.value}
                {row.hint && (
                  <span className="text-ink-soft block text-sm font-normal">
                    {row.hint}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <figcaption className="border-rule bg-label-shade border-t px-5 py-4 pr-36">
          <p className="text-ink-soft text-sm leading-snug">
            {gifts ? (
              <>
                <span className="tabular font-expanded text-ink block text-2xl font-extrabold">
                  {gifts}
                </span>
                gifts sent so far, no addresses shared
              </>
            ) : (
              <>No addresses shared. Ever.</>
            )}
          </p>
        </figcaption>
      </figure>
      <Postmark
        centre={gifts ? "SENT" : "2026"}
        sub={gifts ? "2026 SEASON" : "SEASON"}
        cancellation
        animate
        className="text-gold-ink pointer-events-none absolute -right-8 -bottom-8 w-44 sm:-right-12 sm:w-52"
      />
    </div>
  );
}

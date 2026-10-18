"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

import { api } from "~/trpc/react";
import { Postmark } from "./post/postmark";
import { StampMark } from "./post/stamp-mark";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * One stamp per Christmas season, collected by marking a gift as Gifted or
 * posting a thank-you. Seasons run August to July (see src/server/stamps.ts).
 */
export function StampAlbum() {
  const { data: album } = api.stamps.getMyAlbum.useQuery();

  // Celebrate the moment this season's stamp is collected.
  const current = album?.find((p) => p.current);
  const wasCollected = useRef<boolean | null>(null);
  useEffect(() => {
    if (!current) return;
    if (wasCollected.current === false && current.collected) {
      toast.success(
        `You've collected the ${current.year} stamp for your album.`,
      );
    }
    wasCollected.current = current.collected;
  }, [current]);

  if (!album) return null;
  const nextYear = (album.at(-1)?.year ?? new Date().getFullYear()) + 1;

  return (
    <section aria-labelledby="album-heading" className="w-full">
      <div className="mb-6">
        <h2
          id="album-heading"
          className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase"
        >
          Your stamp album
        </h2>
        <p className="text-frost-soft mt-2 max-w-xl">
          Every Christmas has its own stamp. Mark a gift as Gifted or post a
          thank-you to collect that year&apos;s.
        </p>
      </div>

      <ol className="label-stock grid grid-cols-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-4">
        {album.map((page) => (
          <li
            key={page.year}
            className="border-rule -mr-px -mb-px flex flex-col items-center gap-3 border-r border-b p-5 text-center"
          >
            <div
              className={`relative flex aspect-[4/5] w-full max-w-36 items-center justify-center rounded-sm border ${
                page.collected
                  ? "border-rule bg-label-shade"
                  : page.current
                    ? "border-ink-soft/50 border-dashed"
                    : "border-rule"
              }`}
            >
              {page.collected ? (
                <>
                  <StampMark
                    src={`/brand/stamps/${page.year}.svg`}
                    year={String(page.year)}
                    className="w-[62%] -rotate-3"
                  />
                  <Postmark
                    centre={String(page.year)}
                    sub="COLLECTED"
                    cancellation
                    className="text-gold-ink pointer-events-none absolute -right-3 -bottom-2 w-[78%] opacity-90"
                  />
                </>
              ) : (
                <span className="label-caps text-ink-soft px-3">
                  {page.current
                    ? "Waiting for your first act"
                    : "Not collected"}
                </span>
              )}
            </div>
            <div>
              <p className="font-expanded text-ink font-bold">
                <span className="tabular">{page.year}</span> · {page.design}
              </p>
              <p className="text-ink-soft text-sm">
                {page.collected
                  ? [
                      page.gifts > 0 && plural(page.gifts, "gift", "gifts"),
                      page.thanks > 0 &&
                        plural(page.thanks, "thank-you", "thank-yous"),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : page.current
                    ? "Still to collect this season"
                    : "Missed that season"}
              </p>
            </div>
          </li>
        ))}
        <li className="border-rule -mr-px -mb-px flex flex-col items-center gap-3 border-r border-b p-5 text-center">
          <div className="border-rule flex aspect-[4/5] w-full max-w-36 items-center justify-center rounded-sm border">
            <span className="label-caps text-ink-soft/80 px-3">
              Next Christmas
            </span>
          </div>
          <div>
            <p className="font-expanded text-ink-soft font-bold">
              <span className="tabular">{nextYear}</span>
            </p>
            <p className="text-ink-soft text-sm">A new stamp each season</p>
          </div>
        </li>
      </ol>
    </section>
  );
}

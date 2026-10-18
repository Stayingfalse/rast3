"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { ShareSheet, type ShareRequest } from "./share-sheet";

/**
 * Organisers only: this season's rounded totals for their organisation and
 * team, with a live share card. Hidden for everyone else.
 */
export function GroupTotals() {
  const { data: groups } = api.share.myGroups.useQuery();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [request, setRequest] = useState<ShareRequest | null>(null);

  if (!groups || groups.length === 0) return null;

  return (
    <section aria-labelledby="group-totals-heading" className="w-full">
      <div className="mb-6">
        <h2
          id="group-totals-heading"
          className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase"
        >
          Your Christmas so far
        </h2>
        <p className="text-frost-soft mt-2 max-w-xl">
          For organisers: share this season&apos;s total with your organisation
          or team. Numbers are rounded and never name anyone.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((g) => {
          const label = labels[g.scope] ?? g.label;
          const stats = [
            { k: "Gifts sent", v: g.gifts },
            { k: "Thank-yous", v: g.thanks },
            { k: "Taking part", v: g.members },
          ];
          return (
            <article
              key={g.scope}
              className="label-stock flex flex-col gap-4 overflow-hidden"
            >
              <div className="airmail h-2.5" aria-hidden />
              <div className="flex flex-col gap-4 px-5 pb-5">
                <label className="flex flex-col gap-1">
                  <span className="label-caps text-ink-soft">
                    {g.scope === "org" ? "Organisation" : "Team"} name on the
                    card
                  </span>
                  <input
                    value={label}
                    maxLength={40}
                    onChange={(e) =>
                      setLabels((l) => ({ ...l, [g.scope]: e.target.value }))
                    }
                    className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2 font-semibold"
                  />
                </label>
                <dl className="border-rule grid grid-cols-3 border-y">
                  {stats.map((s) => (
                    <div key={s.k} className="py-3">
                      <dt className="text-ink-soft text-sm">{s.k}</dt>
                      <dd
                        className={
                          s.v
                            ? "font-expanded tabular text-ink text-2xl font-extrabold"
                            : "text-ink-soft pt-1.5 text-base font-semibold"
                        }
                      >
                        {s.v ?? "Under 10"}
                      </dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  disabled={!g.gifts || !label.trim()}
                  onClick={() =>
                    setRequest({
                      kind: "team",
                      scope: g.scope,
                      label: label.trim(),
                    })
                  }
                  className="btn-post self-start"
                >
                  Share the {g.scope === "org" ? "organisation" : "team"} total
                </button>
                {!g.gifts && (
                  <p className="text-ink-soft -mt-2 text-sm">
                    You can share once 10 gifts have been sent this season.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <ShareSheet request={request} onClose={() => setRequest(null)} />
    </section>
  );
}

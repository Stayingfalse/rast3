"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import KudosForm from "./kudos-form";

const day = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

/**
 * Day 26: gifts Santas marked to your list, once they're a few days old.
 * "It's arrived" tells your Santa it landed; a thank-you says so too.
 * Nothing here says who sent what.
 */
export function GiftsToYou() {
  const gifts = api.wishlist.giftsToMe.useQuery();
  const utils = api.useUtils();
  const arrived = api.wishlist.confirmArrived.useMutation({
    onSuccess: () => void utils.wishlist.giftsToMe.invalidate(),
  });
  const [thanking, setThanking] = useState<string | null>(null);

  const list = gifts.data ?? [];
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="gifts-to-you" className="label-stock w-full overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="gifts-to-you" className="font-expanded text-ink text-2xl leading-tight font-extrabold">
            {list.length === 1 ? "A Santa sent you something" : `${list.length} Santas sent you something`}
          </h2>
          <p className="text-ink-soft max-w-prose">
            Tell them when it arrives: they&apos;ll see that it landed, and nothing else.
          </p>
        </div>
        <ul className="divide-rule border-rule flex flex-col divide-y border-y">
          {list.map((g) => (
            <li key={g.id} className="flex flex-col gap-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-ink">
                  <span className="font-semibold">Gift marked {day(g.purchasedAt)}</span>
                  {g.receivedAt && (
                    <span className="text-pine">
                      {" "}
                      · arrived {day(g.receivedAt)}
                      {g.thanked && ", thanked"}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!g.receivedAt && (
                    <button
                      type="button"
                      className="btn-post"
                      disabled={arrived.isPending}
                      onClick={() => arrived.mutate({ purchaseId: g.id })}
                    >
                      It&apos;s arrived
                    </button>
                  )}
                  {!g.thanked && (
                    <button
                      type="button"
                      className="btn-quiet text-ink"
                      aria-expanded={thanking === g.id}
                      onClick={() => setThanking(thanking === g.id ? null : g.id)}
                    >
                      Say thank you
                    </button>
                  )}
                </div>
              </div>
              {thanking === g.id && (
                <KudosForm
                  purchaseId={g.id}
                  onSuccess={() => {
                    setThanking(null);
                    void utils.wishlist.giftsToMe.invalidate();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
        {arrived.error && (
          <p role="alert" className="text-destructive text-sm">
            {arrived.error.message}
          </p>
        )}
      </div>
    </section>
  );
}

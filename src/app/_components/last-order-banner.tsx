"use client";

import { api } from "~/trpc/react";
import { Postmark } from "./post/postmark";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * The last-order countdown (owner, 6 Nov 2026), where Santas pick up: how
 * long they have to order for Christmas delivery. Everything it says comes
 * from season.status, which the server works out (and prefetches with the
 * home page), so the server render and the browser always agree.
 */
export function LastOrderBanner({ className = "" }: { className?: string }) {
  const { data } = api.season.status.useQuery();
  const notice = data?.lastOrder;
  if (!notice) return null;

  if (notice.state === "late") {
    return (
      <p role="status" className={`text-frost-soft max-w-2xl ${className}`}>
        Too late for Christmas delivery? Gifts that arrive in the New Year are
        still random acts.
      </p>
    );
  }

  const lastDay = notice.state === "last-day";
  const days = notice.state === "countdown" ? notice.daysLeft : 0;
  return (
    <div
      className={`rounded-label border-gold/50 flex w-fit max-w-full items-center gap-3 border px-3 py-2.5 sm:gap-4 sm:px-4 ${className}`}
    >
      {/* a date stamp of the last day itself; the words carry the meaning */}
      <Postmark
        top="LAST ORDER"
        bottom="CHRISTMAS POST"
        centre={String(Number(notice.ymd.slice(8, 10)))}
        sub={MONTHS[Number(notice.ymd.slice(5, 7)) - 1]}
        className="text-gold size-14 shrink-0 -rotate-6 sm:size-16"
      />
      <p role="status" className="text-gold-soft min-w-0 leading-snug">
        {lastDay ? (
          <strong className="text-frost">Last day to order for Christmas delivery</strong>
        ) : (
          <>
            <strong className="text-frost">
              Order by {notice.date} for Christmas delivery
            </strong>
            <span className="tabular whitespace-nowrap">
              {" "}
              · {days} {days === 1 ? "day" : "days"} left
            </span>
          </>
        )}
      </p>
    </div>
  );
}

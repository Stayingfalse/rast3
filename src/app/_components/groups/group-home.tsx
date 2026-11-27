"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { memberCounts } from "~/lib/member-counts";
import { trackOpen } from "~/lib/track";
import { api, type RouterOutputs } from "~/trpc/react";
import { type FirstGift, ShareSheet, type ShareRequest } from "../share/share-sheet";
import { LastOrderBanner } from "../last-order-banner";
import { AffiliateNote } from "./affiliate-note";

type Group = RouterOutputs["groups"]["mine"][number];

const REPORT_TYPES = ["NO_ADDRESS", "NO_ITEMS", "DOESNT_EXIST", "OTHER"] as const;
type ReportType = (typeof REPORT_TYPES)[number];
const REPORT_LABEL: Record<string, string> = {
  NO_ADDRESS: "No delivery address on the wishlist",
  NO_ITEMS: "The wishlist is empty",
  DOESNT_EXIST: "The link doesn't work (private or deleted)",
  OTHER: "Something else",
};

/**
 * Day 14: a friends or community group's home: pick up wishlists from the
 * group and mark them gifted.
 */
export function GroupHome({ group }: { group: Group }) {
  const utils = api.useUtils();
  const { data: parcels, isLoading } = api.wishlist.getMyAssignments.useQuery({
    groupId: group.id,
  });
  const pick = api.wishlist.requestFromGroup.useMutation({
    onSuccess: async () => {
      toast.success("Wishlist picked up");
      await utils.wishlist.getMyAssignments.invalidate({ groupId: group.id });
    },
    onError: (e) => toast.error(e.message),
  });
  // a Santa's first gift (ever, or of the season) opens the share window
  // with the season's stamp (4 Nov); later gifts just get the toast
  const [share, setShare] = useState<{ request: ShareRequest; first: FirstGift } | null>(null);
  const gifted = api.wishlist.markPurchase.useMutation({
    onSuccess: async (purchase) => {
      if (purchase.first) {
        setShare({
          request: { kind: "sent", purchaseId: purchase.id },
          first: { kind: purchase.first, year: purchase.season, stamp: purchase.stamp },
        });
      } else {
        toast.success("Marked as gifted. Thank you, Santa!");
      }
      await utils.wishlist.getMyAssignments.invalidate({ groupId: group.id });
      void utils.stamps.getMyAlbum.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // a list that can't be gifted (no address, empty, broken link) can be
  // reported here too, as on the workplace page (owner, 27 Nov)
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("NO_ADDRESS");
  const [reportNote, setReportNote] = useState("");
  const report = api.wishlist.reportIssue.useMutation({
    onSuccess: async () => {
      toast.success("Reported. They'll see it next time they visit.");
      setReportFor(null);
      setReportNote("");
      await utils.wishlist.getMyAssignments.invalidate({ groupId: group.id });
    },
    onError: (e) => toast.error(e.message),
  });
  const clearReport = api.wishlist.clearReport.useMutation({
    onSuccess: async () => {
      await utils.wishlist.getMyAssignments.invalidate({ groupId: group.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const live = group.status === "ACTIVE";
  // approved, but its gifting date (the site's or its own, 7 Nov) is still to come
  const opensLater = live && group.opensLater;
  return (
    <section
      aria-labelledby="group-home-heading"
      className="flex w-full flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <p className="label-caps text-frost-soft">
          {group.kind === "FRIENDS" ? "Friends group" : "Community"} ·{" "}
          {memberCounts(group, ["member", "members"])}
        </p>
        <h2
          id="group-home-heading"
          className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase"
        >
          {group.name}
        </h2>
        {group.affiliate && <AffiliateNote />}
      </div>

      {live && <LastOrderBanner />}

      {!live || opensLater ? (
        <p
          role="status"
          className="rounded-label border-gold/50 text-gold-soft max-w-xl border px-4 py-3"
        >
          {opensLater ? (
            <>
              <strong className="text-frost">
                Gifting opens in this group on{" "}
                {new Date(group.opensAt).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/London",
                })}
                .
              </strong>{" "}
              {group.ready ? (
                <>
                  <strong className="text-frost tabular">
                    {group.ready} {group.ready === 1 ? "list" : "lists"} ready
                  </strong>{" "}
                  so far: invite people so there are more waiting.
                </>
              ) : (
                "Until then, invite people so there are lists waiting."
              )}
            </>
          ) : group.status === "PENDING" ? (
            "This group is waiting for our approval. Gifting opens once it's approved; meanwhile, invite people so there are lists waiting."
          ) : (
            "This group is closed."
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pick.isPending}
            onClick={() => pick.mutate({ groupId: group.id, count: 1 })}
            className="btn-post"
          >
            {pick.isPending ? "Picking…" : "Pick up a wishlist"}
          </button>
          <Link href="/groups" className="btn-quiet text-frost">
            Invite people
          </Link>
        </div>
      )}

      {isLoading ? null : !parcels?.length ? (
        live && !opensLater && (
          <p className="text-frost-soft max-w-xl">
            You haven&apos;t picked up anyone&apos;s wishlist in this group yet.
            Pick one up whenever you&apos;re ready; there&apos;s no draw and no
            deadline.
          </p>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parcels.map((a, i) => {
            const done = !!a.purchases;
            const reported = a.reports[0];
            return (
              <li key={a.id} className="label-stock flex flex-col gap-3 p-5">
                <p className="label-caps text-ink-soft">Parcel {i + 1}</p>
                <p className="text-ink font-semibold">
                  {a.purchases?.receivedAt
                    ? "It arrived. Thank you, Santa!"
                    : done
                      ? "Gifted. Thank you!"
                      : "A wishlist from this group"}
                </p>
                {reported && !done && (
                  <p className="text-ink-soft text-sm">
                    <span className="text-ink font-semibold">Problem reported:</span>{" "}
                    {REPORT_LABEL[reported.reportType] ?? "Something's wrong"}.
                    {reported.description ? ` “${reported.description}”` : ""} They&apos;ll see it next time they visit.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {a.link && (
                    <a
                      href={a.link}
                      {...(a.viaGiftPage
                        ? {}
                        : {
                            target: "_blank",
                            rel: "noopener noreferrer",
                            onClick: () => trackOpen({ assignmentId: a.id }),
                          })}
                      className="btn-quiet text-ink"
                    >
                      Open wishlist
                    </a>
                  )}
                  {!done && (
                    <button
                      type="button"
                      disabled={gifted.isPending}
                      onClick={() => gifted.mutate({ assignmentId: a.id })}
                      className="btn-post"
                    >
                      Mark as gifted
                    </button>
                  )}
                  {!done && !reported && (
                    <button
                      type="button"
                      onClick={() => setReportFor(a.id)}
                      className="btn-quiet text-ink-soft border-transparent"
                    >
                      Report a problem
                    </button>
                  )}
                  {!done && reported && (
                    <button
                      type="button"
                      disabled={clearReport.isPending}
                      onClick={() => clearReport.mutate({ assignmentId: a.id })}
                      className="btn-quiet text-ink-soft border-transparent"
                    >
                      It&apos;s fixed now
                    </button>
                  )}
                </div>
                {reportFor === a.id && (
                  <form
                    className="border-rule flex flex-col gap-3 border-t pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      report.mutate({
                        assignmentId: a.id,
                        reportType,
                        description: reportNote.trim() || undefined,
                      });
                    }}
                  >
                    <label className="text-ink flex flex-col gap-1 text-sm font-semibold">
                      What&apos;s wrong?
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="rounded-label border-rule text-ink border bg-white p-2 font-normal"
                      >
                        {REPORT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {REPORT_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-ink flex flex-col gap-1 text-sm font-semibold">
                      Anything to add? (optional)
                      <textarea
                        value={reportNote}
                        onChange={(e) => setReportNote(e.target.value)}
                        maxLength={300}
                        rows={2}
                        className="rounded-label border-rule text-ink border bg-white p-2 font-normal"
                      />
                    </label>
                    <p className="text-ink-soft text-xs">
                      They won&apos;t see who reported it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={report.isPending} className="btn-post">
                        {report.isPending ? "Sending…" : "Send report"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportFor(null)}
                        className="btn-quiet text-ink border-transparent"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ShareSheet request={share?.request ?? null} first={share?.first} onClose={() => setShare(null)} />
    </section>
  );
}

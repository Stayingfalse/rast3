"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

import { trackOpen } from "~/lib/track";
import { api, type RouterOutputs } from "~/trpc/react";
import { Postmark } from "../post/postmark";
import { type FirstGift, ShareSheet, type ShareRequest } from "../share/share-sheet";

export type Parcel = RouterOutputs["wishlist"]["getMyAssignments"][number];

/**
 * The parcels a Santa has picked up, as cards: open the wishlist, mark it
 * Gifted (with the SENT postmark and the share window), report a problem,
 * undo, archive or hand it back. Shared by the workplace page and friends and
 * community groups (owner, 27 Nov: the groups had a flat, simpler copy).
 */
export function ParcelBoard({
  parcels,
  onChanged,
  routeOf,
}: {
  parcels: Parcel[];
  /** refetch whatever lists these parcels */
  onChanged: () => void;
  /** the line under "Wishlist No. 01": where the list came from */
  routeOf: (p: Parcel) => string;
}) {
  const utils = api.useUtils();
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<"purchase" | "report" | null>(null);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [reportType, setReportType] = useState<"NO_ITEMS" | "DOESNT_EXIST" | "NO_ADDRESS" | "OTHER">("NO_ITEMS");
  const [reportDescription, setReportDescription] = useState("");
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null);
  const [firstGift, setFirstGift] = useState<FirstGift | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const close = () => {
    setSelected(null);
    setModal(null);
  };

  const markPurchase = api.wishlist.markPurchase.useMutation({
    onSuccess: (purchase) => {
      setShareRequest({ kind: "sent", purchaseId: purchase.id });
      setFirstGift(purchase.first ? { kind: purchase.first, year: purchase.season, stamp: purchase.stamp } : null);
      onChanged();
      void utils.stamps.getMyAlbum.invalidate();
      close();
      setPurchaseNotes("");
    },
    onError: (e) => toast.error(e.message),
  });
  const reportIssue = api.wishlist.reportIssue.useMutation({
    onSuccess: () => {
      onChanged();
      close();
      setReportDescription("");
    },
    onError: (e) => toast.error(e.message),
  });
  const clearReport = api.wishlist.clearReport.useMutation({ onSuccess: onChanged });
  const undoPurchase = api.wishlist.undoPurchase.useMutation({
    onSuccess: () => {
      void utils.stamps.getMyAlbum.invalidate();
      onChanged();
    },
  });
  const archiveAssignment = api.wishlist.archiveAssignment.useMutation({
    onSuccess: () => {
      onChanged();
      toast.success("Updated archive status");
    },
    onError: (err) => toast.error(err.message || "Could not update archive status"),
  });
  const unassignAssignment = api.wishlist.unassignAssignment.useMutation({
    onSuccess: () => {
      onChanged();
      toast.success("Assignment released");
    },
    onError: (err) => toast.error(err.message || "Could not unassign wishlist"),
  });

  const confirmToast = (message: string, confirmLabel: string, onConfirm: () => void) =>
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span>{message}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-post min-h-9 px-3 py-1 text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
            <button type="button" className="btn-quiet min-h-9 px-3 py-1 text-sm" onClick={() => toast.dismiss(t.id)}>
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );

  const card = (assignment: Parcel, index: number) => {
    const hasPurchase = !!assignment.purchases;
    const hasReport = assignment.reports.length > 0;
    const archived = assignment.archived;
    return (
      <article
        key={assignment.id}
        className={`label-stock relative flex flex-col overflow-hidden ${archived ? "opacity-80" : ""}`}
      >
        <div className={hasPurchase ? "bg-pine h-2.5" : "airmail h-2.5"} aria-hidden />
        <header className="border-rule flex items-start justify-between gap-3 border-b px-4 pt-3 pb-2">
          <div>
            <p className="label-caps text-ink-soft">
              Wishlist <span className="tabular">No. {String(index + 1).padStart(2, "0")}</span>
            </p>
            <p className="text-ink mt-0.5 text-sm font-semibold">{archived ? "Archived" : routeOf(assignment)}</p>
          </div>
          {hasPurchase ? (
            <span className="label-caps bg-pine-tint text-pine rounded-sm px-2 py-1">
              {assignment.purchases?.receivedAt ? "Arrived" : "Gift sent"}
            </span>
          ) : hasReport ? (
            <span className="label-caps bg-post-tint text-post-deep rounded-sm px-2 py-1">Issue reported</span>
          ) : null}
        </header>

        {hasPurchase && !archived && (
          <Postmark
            centre="SENT"
            sub={`${assignment.season} SEASON`}
            animate
            className="text-pine pointer-events-none absolute top-10 right-3 w-20 opacity-90"
          />
        )}

        <div className="flex flex-1 flex-col gap-3 p-4">
          {hasPurchase && assignment.purchases && (
            <div className="text-ink-soft text-sm">
              <p>
                Purchased:{" "}
                <span className="tabular">
                  {new Date(assignment.purchases.purchasedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}
                </span>
              </p>
              {assignment.purchases.receivedAt && (
                <p className="text-pine font-semibold">
                  It arrived: they told us on{" "}
                  <span className="tabular">
                    {new Date(assignment.purchases.receivedAt).toLocaleDateString("en-GB", {
                      timeZone: "Europe/London",
                    })}
                  </span>
                </p>
              )}
              {assignment.purchases.notes && (
                <p className="text-ink mt-1 italic">&quot;{assignment.purchases.notes}&quot;</p>
              )}
            </div>
          )}
          {hasReport && !hasPurchase && (
            <div className="text-ink-soft text-sm">
              <p>Reported: {REPORT_LABEL[assignment.reports[0]!.reportType] ?? assignment.reports[0]!.reportType}</p>
              {assignment.reports[0]?.description && (
                <p className="text-ink mt-1 italic">&quot;{assignment.reports[0].description}&quot;</p>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <a
              href={assignment.link ?? "#"}
              {...(assignment.viaGiftPage
                ? {}
                : {
                    target: "_blank",
                    rel: "noopener noreferrer",
                    onClick: () => trackOpen({ assignmentId: assignment.id }),
                  })}
              className={hasPurchase || archived ? "btn-quiet text-ink" : "btn-post"}
            >
              View Wishlist{assignment.viaGiftPage ? "" : " on Amazon"}
            </a>

            {!archived && !hasPurchase && !hasReport && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(assignment.id);
                    setModal("purchase");
                  }}
                  className="btn-quiet text-pine"
                >
                  Gifted
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(assignment.id);
                    setModal("report");
                  }}
                  className="btn-quiet text-ink-soft"
                >
                  Report issue
                </button>
              </div>
            )}

            {!archived && hasPurchase && assignment.purchases && (
              <button
                type="button"
                onClick={() => {
                  // sharing again later is the everyday window, not the first-gift one
                  setFirstGift(null);
                  setShareRequest({ kind: "sent", purchaseId: assignment.purchases!.id });
                }}
                className="btn-quiet text-ink"
              >
                Share this act
              </button>
            )}

            {!archived && hasPurchase && (
              <button
                type="button"
                onClick={() =>
                  confirmToast("Undo this purchase? This removes the purchase record.", "Yes, undo", () =>
                    undoPurchase.mutate({ assignmentId: assignment.id }),
                  )
                }
                disabled={undoPurchase.isPending}
                className="btn-quiet text-ink-soft"
              >
                {undoPurchase.isPending ? "Undoing..." : "Undo purchase"}
              </button>
            )}

            {!archived && hasReport && !hasPurchase && (
              <button
                type="button"
                onClick={() =>
                  confirmToast("Mark this issue as fixed? This removes the report.", "Yes, it's fixed", () =>
                    clearReport.mutate({ assignmentId: assignment.id }),
                  )
                }
                disabled={clearReport.isPending}
                className="btn-quiet text-ink"
              >
                {clearReport.isPending ? "Clearing..." : "It's fixed"}
              </button>
            )}
          </div>

          <div className="border-rule flex justify-between gap-3 border-t pt-3 text-sm">
            <button
              type="button"
              onClick={() => archiveAssignment.mutate({ assignmentId: assignment.id, archive: !archived })}
              disabled={archiveAssignment.isPending}
              className="text-ink-soft hover:text-ink min-h-9 font-semibold underline-offset-4 hover:underline"
            >
              {archiveAssignment.isPending ? "Updating..." : archived ? "Unarchive" : "Archive"}
            </button>
            {!hasPurchase && !hasReport && (
              <button
                type="button"
                onClick={() =>
                  confirmToast("Unassigning will release this wishlist for others to pick up. Continue?", "Yes, unassign", () =>
                    unassignAssignment.mutate({ assignmentId: assignment.id }),
                  )
                }
                className="text-post min-h-9 font-semibold underline-offset-4 hover:underline"
              >
                Unassign
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const active = parcels.filter((a) => !a.archived);
  const archived = parcels.filter((a) => a.archived);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{active.map((a, i) => card(a, i))}</div>

      {archived.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            className="btn-quiet text-frost-soft"
          >
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived && (
            <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {archived.map((a, i) => card(a, active.length + i))}
            </div>
          )}
        </div>
      )}

      {selected && modal === "purchase" && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">Mark Purchase Complete</h3>
            <div className="space-y-4">
              <div>
                <label className="label-caps text-ink-soft mb-2 block">Notes (optional)</label>
                <textarea
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="What did you buy? Any special notes..."
                  className="rounded-label border-rule text-ink w-full border bg-white p-3"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => markPurchase.mutate({ assignmentId: selected, notes: purchaseNotes || undefined })}
                  disabled={markPurchase.isPending}
                  className="btn-post flex-1"
                >
                  {markPurchase.isPending ? "Saving..." : "Confirm Purchase"}
                </button>
                <button onClick={close} className="btn-quiet text-ink flex-1">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && modal === "report" && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div className="label-stock shadow-lift w-full max-w-md p-6">
            <h3 className="font-expanded text-ink mb-4 text-xl font-extrabold">Report Wishlist Issue</h3>
            <div className="space-y-4">
              <div>
                <label className="label-caps text-ink-soft mb-2 block">Issue Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as typeof reportType)}
                  className="rounded-label border-rule text-ink w-full border bg-white p-3"
                >
                  <option value="NO_ITEMS">Wishlist has no items</option>
                  <option value="DOESNT_EXIST">Wishlist link {"doesn't"} work</option>
                  <option value="NO_ADDRESS">No shipping address</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>
              <div>
                <label className="label-caps text-ink-soft mb-2 block">Description (optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Additional details about the issue..."
                  className="rounded-label border-rule text-ink w-full border bg-white p-3"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    reportIssue.mutate({
                      assignmentId: selected,
                      reportType,
                      description: reportDescription || undefined,
                    })
                  }
                  disabled={reportIssue.isPending}
                  className="btn-post flex-1"
                >
                  {reportIssue.isPending ? "Reporting..." : "Submit Report"}
                </button>
                <button onClick={close} className="btn-quiet text-ink flex-1">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareSheet
        request={shareRequest}
        first={firstGift}
        onClose={() => {
          setShareRequest(null);
          setFirstGift(null);
        }}
      />
    </>
  );
}

const REPORT_LABEL: Record<string, string> = {
  NO_ITEMS: "No Items",
  DOESNT_EXIST: "Link Doesn't Work",
  NO_ADDRESS: "No Shipping Address",
  OTHER: "Other Issue",
};

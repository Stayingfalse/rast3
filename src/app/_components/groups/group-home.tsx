"use client";

import Link from "next/link";
import { toast } from "react-hot-toast";

import { memberCounts } from "~/lib/member-counts";
import { api, type RouterOutputs } from "~/trpc/react";
import { LastOrderBanner } from "../last-order-banner";
import { ParcelBoard } from "../parcels/parcel-board";
import { AffiliateNote } from "./affiliate-note";

type Group = RouterOutputs["groups"]["mine"][number];

/** How many lists a first pick-up gives, as at work: 3, then one at a time. */
const FIRST_PICK = 3;

/**
 * Day 14: a friends or community group's home: pick up wishlists from the
 * group and gift them. Since 27 Nov the parcels are the same cards as at
 * work (owner: the group's were flat and simple): Gifted with notes and the
 * SENT postmark, report a problem, share, undo, archive, unassign.
 */
export function GroupHome({ group }: { group: Group }) {
  const utils = api.useUtils();
  const { data: parcels, isLoading } = api.wishlist.getMyAssignments.useQuery({
    groupId: group.id,
  });
  const refresh = () => void utils.wishlist.getMyAssignments.invalidate({ groupId: group.id });
  const pick = api.wishlist.requestFromGroup.useMutation({
    onSuccess: (r) => {
      toast.success(r.count === 1 ? "Wishlist picked up" : `${r.count} wishlists picked up`);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const first = !parcels?.length;

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
            onClick={() => pick.mutate({ groupId: group.id, count: first ? FIRST_PICK : 1 })}
            className="btn-post"
          >
            {pick.isPending ? "Picking…" : first ? `Pick up ${FIRST_PICK} wishlists` : "Pick up another"}
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
            Pick up {FIRST_PICK} whenever you&apos;re ready, then more if you like;
            there&apos;s no draw and no deadline.
          </p>
        )
      ) : (
        <ParcelBoard parcels={parcels} onChanged={refresh} routeOf={() => group.name} />
      )}
    </section>
  );
}

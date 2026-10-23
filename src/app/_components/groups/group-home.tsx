"use client";

import Link from "next/link";
import { toast } from "react-hot-toast";

import { trackOpen } from "~/lib/track";
import { api, type RouterOutputs } from "~/trpc/react";
import { AffiliateNote } from "./affiliate-note";

type Group = RouterOutputs["groups"]["mine"][number];

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
  const gifted = api.wishlist.markPurchase.useMutation({
    onSuccess: async () => {
      toast.success("Marked as gifted. Thank you, Santa!");
      await utils.wishlist.getMyAssignments.invalidate({ groupId: group.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const live = group.status === "ACTIVE";
  return (
    <section
      aria-labelledby="group-home-heading"
      className="flex w-full flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <p className="label-caps text-frost-soft">
          {group.kind === "FRIENDS" ? "Friends group" : "Community"} ·{" "}
          {group.members} {group.members === 1 ? "member" : "members"}
        </p>
        <h2
          id="group-home-heading"
          className="font-expanded text-frost text-3xl leading-none font-extrabold uppercase"
        >
          {group.name}
        </h2>
        {group.affiliate && <AffiliateNote />}
      </div>

      {!live ? (
        <p
          role="status"
          className="rounded-label border-gold/50 text-gold-soft max-w-xl border px-4 py-3"
        >
          {group.status === "PENDING"
            ? "This group is waiting for our approval. Gifting opens once it's approved; meanwhile, invite people so there are lists waiting."
            : "This group is closed."}
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
        live && (
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
            return (
              <li key={a.id} className="label-stock flex flex-col gap-3 p-5">
                <p className="label-caps text-ink-soft">Parcel {i + 1}</p>
                <p className="text-ink font-semibold">
                  {done ? "Gifted. Thank you!" : "A wishlist from this group"}
                </p>
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

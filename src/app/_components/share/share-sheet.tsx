"use client";

/* eslint-disable @next/next/no-img-element -- generated card preview */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

import { api } from "~/trpc/react";

export type ShareRequest =
  | { kind: "sent"; purchaseId: string }
  | { kind: "thanks"; kudosId: string }
  | { kind: "team"; scope: "org" | "team"; label: string };

const COPY = {
  sent: {
    title: "Share your random act",
    text: "I just sent a random act of kindness with Random Acts of Santa.",
  },
  thanks: {
    title: "Share your thank-you",
    text: "Someone sent me a random act of kindness. Thank you, Santa!",
  },
  team: {
    title: "Share your total",
    text: "Our Christmas of random acts of kindness so far:",
  },
} as const;

/**
 * Offers a share card for one gift sent or one thank-you posted. The card
 * never shows names, the gift or an address; a thank-you card carries the
 * message and photos the recipient already posted.
 */
export function ShareSheet({
  request,
  onClose,
}: {
  request: ShareRequest | null;
  onClose: () => void;
}) {
  const create = api.share.create.useMutation();
  const [path, setPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { mutate, reset } = create;

  useEffect(() => {
    setPath(null);
    setLoaded(false);
    reset();
    if (!request) return;
    mutate(request, { onSuccess: (r) => setPath(r.path) });
  }, [request, mutate, reset]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, onClose]);

  if (!request || typeof document === "undefined") return null;
  const copy = COPY[request.kind];
  const url = path ? `${window.location.origin}${path}` : null;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: copy.title, text: copy.text, url });
    } catch {
      // Cancelled by the user; nothing to do.
    }
  };
  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="label-stock shadow-lift max-h-[92vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="airmail h-2.5" aria-hidden />
        <div className="flex flex-col gap-4 p-6 pt-5">
          <h2
            id="share-title"
            className="font-expanded text-ink text-2xl leading-tight font-extrabold"
          >
            {copy.title}
          </h2>
          <p className="text-ink-soft text-sm">
            {request.kind === "sent"
              ? "Post it in your team chat or community. The card never shows who it was for, what you sent or anyone's address."
              : request.kind === "thanks"
                ? "Share your thank-you, photos and all. Your Santa stays anonymous, and so does the card."
                : "This season's totals, rounded and never named. The link stays live, so it always shows the latest total."}
          </p>

          <div className="bg-label-shade border-rule relative aspect-[1200/630] w-full overflow-hidden rounded-sm border">
            {path && (
              <img
                src={`${path}/card.png`}
                alt="Your share card"
                onLoad={() => setLoaded(true)}
                className={`h-full w-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
              />
            )}
            {!loaded && (
              <div className="text-ink-soft absolute inset-0 flex items-center justify-center text-sm">
                {create.isError
                  ? "Couldn't make the card. Try again later."
                  : "Making your card…"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {canShare && (
              <button
                type="button"
                onClick={() => void share()}
                disabled={!url}
                className="btn-post col-span-2"
              >
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => void copyLink()}
              disabled={!url}
              className={canShare ? "btn-quiet text-ink" : "btn-post"}
            >
              Copy link
            </button>
            {path ? (
              <a
                href={`${path}/card.png`}
                download={`random-act-of-santa-${request.kind}.png`}
                className="btn-quiet text-ink"
              >
                Save image
              </a>
            ) : (
              <span className="btn-quiet text-ink opacity-50">Save image</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-soft min-h-10 self-center text-sm font-semibold underline-offset-4 hover:underline"
          >
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

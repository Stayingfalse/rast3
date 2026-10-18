/* eslint-disable @next/next/no-img-element -- generated card and stored photos */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  countShareView,
  getPublicShareCard,
  type ShareKind,
} from "~/server/share-cards";
import { getProxyImageUrl } from "~/utils/image-utils";
import { JoinButton } from "../post/join-button";

const COPY: Record<ShareKind, { title: string; description: string }> = {
  sent: {
    title: "I sent a random act of kindness",
    description:
      "A Christmas gift to a colleague, sent through their wishlist. No names, no addresses, no draw.",
  },
  thanks: {
    title: "A thank-you for a random act of kindness",
    description:
      "Someone received a Christmas gift from a mystery Santa, and said thank you.",
  },
  team: {
    title: "Our Christmas of random acts",
    description:
      "Colleagues sending each other Christmas gifts through their wishlists. No names, no addresses, no draw.",
  },
};

export async function shareCardMetadata(
  kind: ShareKind,
  code: string,
): Promise<Metadata> {
  const card = await getPublicShareCard(code, kind);
  if (!card) return { title: "Random Acts of Santa", robots: { index: false } };
  const image = `/${kind}/${code}/card.png`;
  return {
    title: `${COPY[kind].title} · Random Acts of Santa`,
    description: COPY[kind].description,
    robots: { index: false, follow: false },
    openGraph: {
      title: COPY[kind].title,
      description: COPY[kind].description,
      url: `/${kind}/${code}`,
      images: [{ url: image, width: 1200, height: 630, alt: COPY[kind].title }],
      type: "website",
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export async function ShareCardPage({
  kind,
  code,
}: {
  kind: ShareKind;
  code: string;
}) {
  const card = await getPublicShareCard(code, kind);
  if (!card) notFound();
  await countShareView(code);

  return (
    <article className="flex w-full max-w-3xl flex-col gap-8">
      <h1 className="font-expanded text-frost text-3xl leading-tight font-extrabold sm:text-4xl">
        {kind === "sent"
          ? "Someone sent a random act of kindness"
          : kind === "thanks"
            ? "Someone said thank you to their Santa"
            : `A Christmas of random acts at ${card.group?.label ?? "this team"}`}
      </h1>

      <img
        src={`/${kind}/${code}/card.png`}
        alt={
          kind === "thanks" && card.message
            ? `Thank-you card: “${card.message}”`
            : kind === "team" && card.group
              ? `${card.group.label}: ${[
                  card.group.gifts && `${card.group.gifts} gifts sent`,
                  card.group.thanks && `${card.group.thanks} thank-yous`,
                  card.group.members && `${card.group.members} taking part`,
                ]
                  .filter(Boolean)
                  .join(", ")}`
              : "Parcel label: to a colleague, from Santa, address withheld"
        }
        width={1200}
        height={630}
        className="shadow-lift rounded-label h-auto w-full"
      />

      {kind === "thanks" &&
        (card.images.length > 0 || (card.message ?? "").length > 170) && (
          <div className="label-stock flex flex-col gap-4 p-6">
            <p className="text-ink text-lg leading-relaxed whitespace-pre-wrap">
              “{card.message}”
            </p>
            {card.images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {card.images.map((url) => (
                  <img
                    key={url}
                    src={getProxyImageUrl(url)}
                    alt="Photo shared with the thank-you"
                    className="aspect-square w-full rounded-sm object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
        )}

      <div className="border-frost/25 flex flex-col gap-4 border-y py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="font-expanded text-frost text-xl font-bold">
            Random Acts, not Secret Santa
          </p>
          <p className="text-frost-soft mt-2">
            Share your Amazon wishlist, pick up a few colleagues&apos; whenever
            you&apos;re ready, and gift what you like. Nobody ever sees an
            address.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <JoinButton label="Join Random Acts of Santa" />
          <Link href="/#how-it-works" className="btn-quiet text-frost">
            How it works
          </Link>
        </div>
      </div>
    </article>
  );
}

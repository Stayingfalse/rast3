import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShareJoinFooter } from "~/app/_components/share/share-card-page";
import { db } from "~/server/db";
import { countShareView } from "~/server/share-cards";
import { getPublicWall, wallPath } from "~/server/wall";

type Props = { params: Promise<{ code: string }> };

const DESCRIPTION =
  "Thank-yous for Christmas gifts sent as random acts of kindness, posted under festive names. No real names, no gifts, no addresses.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const wall = await getPublicWall(db, code);
  if (!wall) return { title: "Random Acts of Santa", robots: { index: false } };
  const title = `${wall.label}: a Wall of Kindness`;
  const image = `${wallPath(code)}/card.png`;
  return {
    title: `${title} · Random Acts of Santa`,
    description: DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: DESCRIPTION,
      url: wallPath(code),
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/**
 * Day 34: a group's Wall of Kindness, public. Festive names and messages
 * only: never a real name, an email, the gift, or a photo.
 */
export default async function Page({ params }: Props) {
  const { code } = await params;
  const wall = await getPublicWall(db, code);
  if (!wall) notFound();
  await countShareView(code);

  const stats = [
    { k: "Thank-yous", v: wall.thanks },
    { k: "Gifts sent", v: wall.gifts },
  ].filter((s): s is { k: string; v: string } => s.v !== null);

  return (
    <article className="flex w-full max-w-5xl flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="font-expanded text-frost text-3xl leading-tight font-extrabold text-balance break-words sm:text-5xl sm:leading-none">
          A Wall of Kindness from{" "}
          <span className="text-gold-soft">{wall.label}</span>
        </h1>
        <p className="text-frost-soft max-w-xl text-lg">
          Christmas {wall.season}. Every gift here was a random act: someone
          picked up a wishlist and sent something, no draw, no address. These
          are the thank-yous, under festive names.
        </p>
        {stats.length > 0 && (
          <dl className="border-frost/25 text-frost mt-2 flex flex-wrap gap-x-12 border-y">
            {stats.map((s) => (
              <div key={s.k} className="py-3">
                <dt className="text-frost-soft text-sm">{s.k}</dt>
                <dd className="font-expanded tabular text-3xl font-extrabold">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <ul
        aria-label="Thank-yous"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {wall.notes.map((n, i) => (
          <li key={i} className="label-stock flex flex-col overflow-hidden">
            <div className="airmail h-2.5" aria-hidden />
            <blockquote className="text-ink flex-1 p-5 pb-0 leading-relaxed break-words whitespace-pre-wrap">
              “{n.message}”
            </blockquote>
            <p className="border-rule font-expanded text-ink mx-5 mt-4 mb-5 border-t pt-3 text-sm font-bold">
              {n.name}
            </p>
          </li>
        ))}
      </ul>

      <ShareJoinFooter pickUp="a few random wishlists" />
    </article>
  );
}

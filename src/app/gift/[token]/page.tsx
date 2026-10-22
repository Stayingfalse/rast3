import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  affiliateFor,
  AMAZON_DISCLOSURE,
  taggedUrl,
  tagForHost,
} from "~/server/affiliate";
import { db } from "~/server/db";

export const metadata: Metadata = {
  title: "A wishlist to gift · Random Acts of Santa",
  description:
    "A Christmas wishlist picked up on Random Acts of Santa: gift anonymously, no names, no addresses.",
  // kept out of search results, but crawlers (Amazon's reviewers) may follow the link
  robots: { index: false, follow: true },
};

type Props = { params: Promise<{ token: string }> };

/**
 * The public gift page (20 Oct): where a picked-up wishlist is opened from
 * when affiliate links are on for its group. Public on purpose (Amazon
 * Associates links must sit on publicly reachable pages), so it shows no
 * names, groups or emails: only the wishlist link, guidance and the
 * disclosure. The address is fixed and the page never expires, even after
 * the list is handed back or the season ends.
 */
export default async function GiftPage({ params }: Props) {
  const { token } = await params;
  const page = await db.giftPage.findUnique({
    where: { id: token },
    select: {
      season: true,
      groupId: true,
      ownerId: true,
      wishlistUrl: true,
      owner: { select: { amazonWishlistUrl: true } },
    },
  });
  if (!page) notFound();

  // Gift pages never expire (owner, 20 Oct): an old page keeps its link and
  // the group's tracking ID for the season it was made in. Nothing on the
  // site links to past seasons' pages, so only Amazon's reviewers revisit.
  // the list this page was made for, never the owner's later ones; gone once
  // the owner deletes their account
  const wishlist = page.ownerId ? (page.wishlistUrl ?? page.owner?.amazonWishlistUrl ?? null) : null;
  const affiliate = await affiliateFor(db, page.groupId, page.season);
  const h = await headers();
  const tagged =
    wishlist && affiliate.enabled
      ? taggedUrl(
          wishlist,
          tagForHost(affiliate.tag, h.get("x-forwarded-host") ?? h.get("host")),
        )
      : null;

  return (
    <article className="flex w-full max-w-3xl flex-col gap-8">
      <h1 className="font-expanded text-frost text-3xl leading-tight font-extrabold sm:text-4xl">
        A wishlist to gift
      </h1>

      <section className="label-stock relative overflow-hidden">
        <div className="airmail h-2.5" aria-hidden />
        <div className="flex flex-col gap-4 p-6">
          {!wishlist ? (
            <>
              <p className="label-caps text-ink-soft">Not available</p>
              <p className="text-ink text-lg">
                This wishlist isn&apos;t available any more. Its owner may have
                changed or removed it. You can pick up another one from your
                group.
              </p>
            </>
          ) : (
            <>
              <p className="label-caps text-ink-soft">To: a mystery recipient</p>
              <p className="text-ink text-lg">
                Someone in your group shared this Amazon wishlist. You
                don&apos;t know who, and they won&apos;t know it&apos;s you.
              </p>
              <div className="flex flex-col gap-2">
                {tagged && (
                  // UK ad rules: say it's an ad before the link, not after
                  <p className="text-ink-soft text-sm">
                    <span className="label-caps text-ink mr-2">Ad · Affiliate link</span>
                    {AMAZON_DISCLOSURE} It costs you nothing extra.
                  </p>
                )}
                <a
                  href={tagged ?? wishlist}
                  target="_blank"
                  // Associates links must not hide the page they come from
                  {...(tagged
                    ? { rel: "sponsored noopener", referrerPolicy: "no-referrer-when-downgrade" as const }
                    : { rel: "noopener noreferrer" })}
                  className="btn-post self-start"
                >
                  Open the wishlist on Amazon
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      <section
        aria-labelledby="gift-tips"
        className="border-frost/25 flex flex-col gap-4 border-y py-8"
      >
        <h2
          id="gift-tips"
          className="font-expanded text-frost text-xl font-bold"
        >
          Sending your gift
        </h2>
        <ol className="text-frost-soft flex list-decimal flex-col gap-3 pl-5">
          <li>
            Pick something from the list. Wishlists show what the person
            actually wants, so there&apos;s no guessing.
          </li>
          <li>
            At checkout, choose the wishlist owner&apos;s gift address. Amazon
            delivers to them without ever showing you where they live.
          </li>
          <li>
            Leave your name off the gift message if you&apos;d like to stay a
            mystery Santa.
          </li>
          <li>
            Back on Random Acts of Santa, mark the wishlist as gifted so they
            can send you a thank-you postcard.
          </li>
        </ol>
      </section>

      {tagged && (
        <section aria-labelledby="why-affiliate" className="flex flex-col gap-3">
          <h2
            id="why-affiliate"
            className="font-expanded text-frost text-xl font-bold"
          >
            Why is this an affiliate link?
          </h2>
          <p className="text-frost-soft max-w-2xl">
            When you buy through this link, Amazon pays Random Acts of Santa a
            small commission. The price you pay is the same. It helps keep
            the site free for groups and communities. Nobody is rewarded for
            using the link, and gifting counts the same however you buy.
          </p>
        </section>
      )}

      <p>
        <Link href="/" className="text-frost-soft underline underline-offset-4">
          Back to Random Acts of Santa
        </Link>
      </p>
    </article>
  );
}

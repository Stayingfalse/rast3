import type { Metadata } from "next";
import Link from "next/link";

import { db } from "~/server/db";
import { validArrival } from "~/server/gifts";

export const metadata: Metadata = {
  title: "Gift arrived · Random Acts of Santa",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ p?: string; t?: string }> };

/**
 * Day 26: the gift check-in email's "Something's arrived" link. Opening the
 * link changes nothing (mail scanners open links); the button does.
 */
export default async function ArrivedPage({ searchParams }: Props) {
  const { p = "", t = "" } = await searchParams;
  const gift =
    p && validArrival(p, t)
      ? await db.purchase.findUnique({ where: { id: p }, select: { receivedAt: true } })
      : null;

  return (
    <section className="label-stock flex w-full max-w-xl flex-col gap-5 overflow-hidden">
      <div className="airmail h-2.5 w-full" aria-hidden />
      <div className="flex flex-col items-start gap-4 px-6 pb-8 sm:px-8">
        {!gift ? (
          <>
            <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
              This link doesn&apos;t work
            </h1>
            <p className="text-ink-soft max-w-md">
              It may be incomplete, or the gift may no longer be recorded. Sign in to see the gifts
              sent your way.
            </p>
          </>
        ) : gift.receivedAt ? (
          <>
            <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
              Lovely. Your Santa will know it arrived.
            </h1>
            <p className="text-ink-soft max-w-md">
              They&apos;ll see it landed, and nothing else. Want to say more? Post them a thank-you
              postcard: it goes on the thank-you feed under a festive name.
            </p>
            <Link href="/#kudos-section" className="btn-post">
              Post a thank-you
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
              Has something arrived?
            </h1>
            <p className="text-ink-soft max-w-md">
              If a parcel from a mystery Santa has turned up, let them know. They&apos;ll see that it
              landed, and nothing else.
            </p>
            <form
              method="post"
              action={`/api/gift/arrived?p=${encodeURIComponent(p)}&t=${encodeURIComponent(t)}`}
            >
              <button type="submit" className="btn-post">
                Yes, something&apos;s arrived
              </button>
            </form>
          </>
        )}
        <Link href="/" className="text-ink-soft underline underline-offset-4">
          Back to Random Acts of Santa
        </Link>
      </div>
    </section>
  );
}

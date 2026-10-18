import Link from "next/link";

import { StampMark } from "./_components/post/stamp-mark";

export default function NotFound() {
  return (
    <section className="label-stock flex w-full max-w-xl flex-col items-start gap-5 overflow-hidden">
      <div className="airmail h-2.5 w-full" aria-hidden />
      <div className="flex w-full items-start justify-between gap-6 px-6 pb-8 sm:px-8">
        <div>
          <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
            Return to sender
          </h1>
          <p className="text-ink-soft mt-3 max-w-sm">
            We couldn&apos;t find that page. The link may be old, or the card it
            pointed to may have been taken down.
          </p>
          <Link href="/" className="btn-post mt-6">
            Back to Random Acts of Santa
          </Link>
        </div>
        <StampMark className="w-16 shrink-0 rotate-3" />
      </div>
    </section>
  );
}

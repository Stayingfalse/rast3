import Link from "next/link";

import { AMAZON_DISCLOSURE } from "~/server/affiliate";

/** Site-wide footer: the Amazon Associates disclosure and the small print. */
export function SiteFooter() {
  return (
    <footer className="border-frost/25 text-frost-soft relative z-10 w-full max-w-6xl border-t px-4 py-6 text-sm sm:px-6">
      <p>
        {AMAZON_DISCLOSURE}{" "}
        <Link href="/privacy#affiliate" className="underline underline-offset-4">
          About affiliate links
        </Link>
      </p>
    </footer>
  );
}

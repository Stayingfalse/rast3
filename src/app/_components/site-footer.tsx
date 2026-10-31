import Link from "next/link";

import { AMAZON_DISCLOSURE } from "~/server/affiliate";

const link = "underline underline-offset-4 hover:text-frost";
// small-print links are tap targets of their own (24px or more)
const navLink = `${link} inline-block py-1`;

/** Site-wide footer: the Amazon Associates disclosure and the small print. */
export function SiteFooter() {
  return (
    <footer className="border-frost/25 text-frost-soft relative z-10 flex w-full max-w-6xl flex-col gap-3 border-t px-4 py-6 text-sm sm:px-6">
      <p>
        {AMAZON_DISCLOSURE}{" "}
        <Link href="/privacy#affiliate" className={link}>
          About affiliate links
        </Link>
      </p>
      <nav aria-label="Small print" className="flex flex-wrap gap-x-5 gap-y-1">
        <Link href="/privacy" className={navLink}>
          Privacy
        </Link>
        <Link href="/terms" className={navLink}>
          Terms
        </Link>
        <Link href="/account" className={navLink}>
          Your data
        </Link>
      </nav>
    </footer>
  );
}

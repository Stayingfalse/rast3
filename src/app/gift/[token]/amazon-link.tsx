"use client";

import type { ReactNode } from "react";

import { trackOpen } from "~/lib/track";

/**
 * The gift page's button to Amazon. The link itself is untouched (Associates
 * rules: no redirects, the referring page stays visible); clicking it also
 * counts the open on our own server.
 */
export function AmazonLink({
  href,
  token,
  tagged,
  className,
  children,
}: {
  href: string;
  token: string;
  tagged: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      // Associates links must not hide the page they come from
      {...(tagged
        ? { rel: "sponsored noopener", referrerPolicy: "no-referrer-when-downgrade" as const }
        : { rel: "noopener noreferrer" })}
      onClick={() => trackOpen({ giftPage: token })}
      className={className}
    >
      {children}
    </a>
  );
}

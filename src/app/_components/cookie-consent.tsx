"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Cookie notice. The site sets only strictly necessary cookies (sign-in and
 * this notice), so under PECR there is nothing to consent to: this just tells
 * people, once. If analytics or other optional cookies are ever added, this
 * must become a real consent choice again and /privacy must be updated.
 */
const NOTICE_COOKIE = "cookie-consent";
const NOTICE_DAYS = 365;

function hasSeenNotice() {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${NOTICE_COOKIE}=`));
}

export function CookieConsent({ className = "" }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasSeenNotice());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    const expires = new Date(Date.now() + NOTICE_DAYS * 24 * 60 * 60 * 1000);
    document.cookie = `${NOTICE_COOKIE}=seen; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    setVisible(false);
  };

  return (
    <section
      aria-label="Cookie notice"
      className={`border-rule bg-label text-ink shadow-lift fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-center sm:gap-6 ${className}`}
    >
      <p className="text-ink text-sm leading-snug">
        <strong>Cookies.</strong> We only use the cookies needed to keep you
        signed in. No tracking, no adverts.{" "}
        <Link
          href="/privacy#cookies"
          className="text-post font-semibold underline underline-offset-4"
        >
          Privacy policy
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="btn-post min-h-9 shrink-0 self-start py-1.5 text-sm sm:self-auto"
      >
        OK
      </button>
    </section>
  );
}

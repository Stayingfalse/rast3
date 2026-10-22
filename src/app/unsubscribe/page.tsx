import type { Metadata } from "next";
import Link from "next/link";

import { db } from "~/server/db";
import { validUnsubscribe } from "~/server/email/unsubscribe";

export const metadata: Metadata = {
  title: "Reminder emails · Random Acts of Santa",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ u?: string; t?: string; done?: string }> };

/**
 * Reminder emails' "Stop" link (22 Oct). Opening the link changes nothing
 * (mail scanners open links); the button does.
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { u = "", t = "", done } = await searchParams;
  const valid = !!u && validUnsubscribe(u, t);
  const user = valid
    ? await db.user.findUnique({ where: { id: u }, select: { emailReminders: true } })
    : null;
  const action = (on: boolean) =>
    `/api/email/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}${on ? "&on=1" : ""}`;

  return (
    <section className="label-stock flex w-full max-w-xl flex-col gap-5 overflow-hidden">
      <div className="airmail h-2.5 w-full" aria-hidden />
      <div className="flex flex-col items-start gap-4 px-6 pb-8 sm:px-8">
        {!user ? (
          <>
            <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
              This link doesn&apos;t work
            </h1>
            <p className="text-ink-soft max-w-md">
              It may be incomplete or the account may have been deleted. Use the
              link in your latest reminder email.
            </p>
          </>
        ) : user.emailReminders ? (
          <>
            <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
              {done === "on" ? "Reminders are back on" : "Stop reminder emails?"}
            </h1>
            <p className="text-ink-soft max-w-md">
              We send a few a season: a nudge to check in before gifting opens,
              one when it opens, and one when a Santa sends you a gift.
            </p>
            <form method="post" action={action(false)}>
              <input type="hidden" name="from" value="page" />
              <button type="submit" className="btn-post">
                Stop reminder emails
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-expanded text-ink text-3xl leading-tight font-extrabold">
              {done === "off" ? "Done: no more reminders" : "Reminders are off"}
            </h1>
            <p className="text-ink-soft max-w-md">
              You won&apos;t get reminder emails from Random Acts of Santa. Sign-in
              links still arrive when you ask for one.
            </p>
            <form method="post" action={action(true)}>
              <input type="hidden" name="from" value="page" />
              <button type="submit" className="btn-quiet text-ink">
                Turn reminders back on
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

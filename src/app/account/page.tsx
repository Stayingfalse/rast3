import { type Metadata } from "next";
import Link from "next/link";

import { getSession } from "~/server/auth";
import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = {
  title: "Your data · Random Acts of Santa",
  robots: { index: false },
};

const link = "text-post font-semibold underline underline-offset-4";

/** Day 30: download your data, or delete your account. */
export default async function AccountPage() {
  const session = await getSession();

  return (
    <article className="label-stock text-ink w-full max-w-3xl overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-8 p-6 sm:p-10">
        <header>
          <h1 className="font-expanded text-3xl font-extrabold">Your data</h1>
          <p className="mt-3 max-w-[65ch] text-lg leading-relaxed">
            Take a copy of everything Random Acts of Santa holds about you, or
            delete your account. Your name and wishlist can be changed any time
            from <span className="font-semibold">Edit profile</span> on the home
            page.
          </p>
        </header>

        {!session?.user ? (
          <p className="leading-relaxed">
            <Link href="/" className={link}>
              Sign in
            </Link>{" "}
            to download or delete your data. Signed out, we hold nothing about
            you beyond our short-lived server logs.
          </p>
        ) : (
          <>
            <section aria-labelledby="download" className="border-rule border-t pt-6">
              <h2 id="download" className="font-expanded mb-3 text-xl font-extrabold">
                Download your data
              </h2>
              <p className="max-w-[65ch] leading-relaxed">
                One file with your profile, sign-in methods, groups, check-ins,
                the lists you picked up and what you gifted, gifts sent to you,
                your thank-yous and photos, share cards and the reminder emails
                we sent. Nobody else is named in it: Santas and the people you
                gifted stay anonymous.
              </p>
              <a href="/api/account/export" download className="btn-post mt-5 inline-flex">
                Download my data (JSON)
              </a>
            </section>

            <section aria-labelledby="delete" className="border-rule border-t pt-6">
              <h2 id="delete" className="font-expanded mb-3 text-xl font-extrabold">
                Delete your account
              </h2>
              <div className="max-w-[65ch] space-y-3 leading-relaxed">
                <p>
                  This deletes your account straight away, with your profile,
                  groups, pick-ups, the gifts you marked, your thank-yous and
                  their photos, and your share cards. Your wishlist stops being
                  handed out, and gifts already marked on it are removed.
                </p>
                <p>
                  Groups you started stay for their other members. It can&apos;t
                  be undone: if you come back, you start a new account.
                </p>
              </div>
              <DeleteAccount />
            </section>
          </>
        )}

        <p className="text-ink-soft border-rule border-t pt-6 text-sm">
          How we use your data: the{" "}
          <Link href="/privacy" className={link}>
            privacy policy
          </Link>
          . Questions:{" "}
          <a href="mailto:privacy@raosanta.uk" className={link}>
            privacy@raosanta.uk
          </a>
          .
        </p>
      </div>
    </article>
  );
}

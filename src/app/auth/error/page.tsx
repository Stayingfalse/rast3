import type { Metadata } from "next";
import Link from "next/link";

import { SignInAgain } from "./sign-in-again";

export const metadata: Metadata = { title: "Sign-in problem", robots: { index: false } };

/**
 * Where Auth.js sends a failed sign-in (24 Nov). Its own page was unbranded
 * and its "Sign in" link went to an unstyled list of providers. The usual
 * failure is a sign-in link that's already been used: work email systems
 * often open links to check them, which uses them up.
 */
const MESSAGES: Record<string, { title: string; body: string[]; action: string }> = {
  Verification: {
    title: "This sign-in link has already been used",
    body: [
      "Each link works once, within 24 hours of when we sent it.",
      "Some work email systems open links to check them before you do, which uses them up. If that keeps happening, use a personal email address, or sign in with Google or Discord.",
    ],
    action: "Get a new sign-in link",
  },
  TooManyRequests: {
    title: "Too many sign-in links asked for",
    body: ["To keep our emails out of spam folders, we only send a few sign-in links at a time. Please try again in 15 minutes, or sign in with Google or Discord now."],
    action: "Sign in another way",
  },
  AccessDenied: {
    title: "That account can't sign in here",
    body: ["Try another sign-in option, or a different account."],
    action: "Choose another way to sign in",
  },
  OAuthAccountNotLinked: {
    title: "That email address already has an account",
    body: ["Sign in the way you did before, for example with an email link, and you'll get your account."],
    action: "Sign in another way",
  },
};
const FALLBACK = {
  title: "We couldn't sign you in",
  body: ["Something went wrong while signing you in. Please try again, or use another sign-in option."],
  action: "Try again",
};

export default async function SignInErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const m = (error ? MESSAGES[error] : undefined) ?? FALLBACK;
  return (
    <div className="flex w-full items-center justify-center">
      <div className="label-stock w-full max-w-md p-8 text-center">
        <h1 className="font-expanded text-ink mb-4 text-2xl leading-tight font-extrabold">{m.title}</h1>
        <div className="text-ink-soft mb-6 space-y-3 text-left">
          {m.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <SignInAgain label={m.action} />
        <p className="border-rule text-ink-soft mt-8 border-t pt-6 text-sm">
          <Link href="/" className="text-post font-semibold underline underline-offset-4">
            Back to the home page
          </Link>
        </p>
      </div>
    </div>
  );
}

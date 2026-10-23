"use client";

import { getProviders, signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clientLogger } from "~/utils/client-logger";

const logger = clientLogger;

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** show just this provider (e.g. "discord" on a community invite), with a link to the rest */
  only?: string;
  /** prefill the email link form (a workplace invite's work email) */
  initialEmail?: string;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

type ProvidersState = Record<string, Provider> | null;

function useIconDataUrl(providerId: string) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/icons/${providerId}`)
      .then((response) => response.text())
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [providerId]);

  return { dataUrl, isLoading };
}

function SafeIcon({
  providerId,
  alt,
  className,
}: {
  providerId: string;
  alt: string;
  className?: string;
}) {
  const { dataUrl, isLoading } = useIconDataUrl(providerId);

  if (isLoading) {
    return (
      <div className={`${className} bg-label-shade animate-pulse rounded`} />
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`${className} bg-label-shade text-ink-soft flex items-center justify-center rounded text-xs`}
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={dataUrl}
      alt={alt}
      width={24}
      height={24}
      className={className}
      loading="lazy"
    />
  );
}

export function SignInModal({ isOpen, onClose, only, initialEmail }: SignInModalProps) {
  const [showAll, setShowAll] = useState(false);
  const [providers, setProviders] = useState<ProvidersState>(null);
  // only that provider, unless it isn't configured here (then everything)
  const restricted = !!only && !showAll && ((providers === null || !!providers[only]));
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  React.useEffect(() => {
    if (isOpen) {
      void getProviders().then(setProviders);
      if (initialEmail) setEmail(initialEmail);
    } else {
      setShowAll(false);
      // Reset states when modal is closed
      setEmailSent(false);
      setShowEmailForm(false);
      setEmail("");
      setIsLoading(null);
    }
  }, [isOpen, initialEmail]);
  const handleSignIn = async (providerId: string, email?: string) => {
    setIsLoading(providerId);
    try {
      if (providerId === "nodemailer" && email) {
        // Store email for the verify-request page as fallback
        localStorage.setItem("magic-link-email", email);
        const result = await signIn(providerId, {
          email,
          redirect: false,
          callbackUrl: window.location.href, // back to the page they were on (e.g. an invite)
        });
        // Check if sign-in was successful
        if (result?.error) {
          logger.error(result.error, "Magic link sign-in error", {
            providerId,
            email: email ?? undefined,
          });
          // You could show an error message here
        } else {
          // Show success state in modal
          setEmailSent(true);
          // Magic link sent successfully - client-side info logging not needed
        }
      } else {
        await signIn(providerId);
        // OAuth sign-in initiated - client-side info logging not needed
      }
    } catch (error) {
      logger.error(
        error instanceof Error ? error.message : String(error),
        "Sign in error",
        {
          providerId,
          email: email ?? undefined,
        },
      );
    } finally {
      setIsLoading(null);
    }
  };
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await handleSignIn("nodemailer", email);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  // Provider button color mapping
  const providerStyles: Record<string, string> = {
    github: "bg-gray-800 hover:bg-gray-900 text-white border border-gray-300",
    google: "bg-white text-ink border border-rule hover:bg-label-shade",
    discord: "bg-[#5865F2] hover:bg-[#4752C4] text-white",
    twitch: "bg-[#9147FF] hover:bg-[#772CE8] text-white",
    reddit: "bg-[#FF4500] hover:bg-[#D73600] text-white",
    facebook: "bg-[#1877F3] hover:bg-[#145DB2] text-white",
    instagram: "bg-[#C13584] hover:bg-[#A02D6E] text-white border-0",
    tiktok: "bg-black hover:bg-gray-900 text-white border-0",
    email: "bg-green-600 hover:bg-green-700 text-white border-0",
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-title"
      className="bg-night-deep/75 fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      <div className="label-stock shadow-lift relative max-h-[92vh] w-full max-w-md overflow-y-auto">
        <div className="airmail h-2.5" aria-hidden />
        <div className="p-6 pt-5">
          {/* Close button */}
          <button
            onClick={() => {
              setEmailSent(false);
              setShowEmailForm(false);
              setEmail("");
              onClose();
            }}
            aria-label="Close"
            className="text-ink-soft hover:text-ink absolute top-5 right-4 rounded-sm p-1"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {/* Modal content */}
          <div className="text-left">
            {emailSent ? (
              // Email sent success state
              <div className="space-y-6">
                {/* Success Icon */}
                <div className="bg-pine-tint flex h-14 w-14 items-center justify-center rounded-full">
                  <svg
                    className="text-pine h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h2
                  id="sign-in-title"
                  className="font-expanded text-ink text-2xl font-extrabold"
                >
                  Check your email
                </h2>

                {/* Description */}
                <div className="text-ink-soft space-y-2">
                  <p>
                    We&apos;ve sent a magic link to{" "}
                    <span className="text-ink font-semibold">{email}</span>
                  </p>
                  <p className="text-sm">
                    Click the link in the email to sign in to your account.
                  </p>
                </div>

                {/* Instructions */}
                <div className="rounded-label border-rule bg-label-shade border p-4 text-left">
                  <div className="text-ink space-y-2 text-sm">
                    <p className="font-medium">Next steps:</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>Check your email inbox</li>
                      <li>Look for an email from our system</li>
                      <li>Click the &quot;Sign in&quot; link in the email</li>
                      <li>You&apos;ll be automatically signed in</li>
                    </ul>
                  </div>
                </div>

                {/* Troubleshooting */}
                <div className="text-ink-soft space-y-1 text-xs">
                  <p>
                    <strong>Don&apos;t see the email?</strong> Check your spam
                    folder.
                  </p>
                  <p>The link will expire in 24 hours for security.</p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setShowEmailForm(true);
                      setEmail("");
                    }}
                    className="btn-post w-full"
                  >
                    Send Another Link
                  </button>
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setShowEmailForm(false);
                      setEmail("");
                    }}
                    className="btn-quiet text-ink w-full"
                  >
                    Try Different Method
                  </button>
                </div>
              </div>
            ) : (
              // Normal sign-in state
              <>
                <h2
                  id="sign-in-title"
                  className="font-expanded text-ink pr-8 text-2xl leading-tight font-extrabold"
                >
                  Join Random Acts of Santa
                </h2>
                <p className="text-ink-soft mt-2 mb-5 text-sm">
                  Already a member? Use the same option to sign in. We suggest a
                  personal email or a social login.{" "}
                  <button
                    type="button"
                    onClick={() => setShowWhy((v) => !v)}
                    aria-expanded={showWhy}
                    className="text-post font-semibold underline underline-offset-4"
                  >
                    Why?
                  </button>
                </p>
                {showWhy && (
                  <div className="rounded-label border-rule bg-label-shade text-ink mb-4 border p-3 text-sm">
                    Many corporate mail systems block emails from external
                    domains that aren&apos;t explicitly trusted. To avoid missed
                    magic-link emails, use a personal email address or sign in
                    with a social account. Once you&apos;re signed in, you can
                    add your work email on the profile setup to link your
                    account with the rest of your organisation.
                  </div>
                )}
                <div className="space-y-3">
                  {isLoading ? (
                    // Show preloader when any authentication is in progress
                    <div className="flex flex-col items-center justify-center space-y-4 py-12">
                      <div className="border-rule border-t-post h-12 w-12 animate-spin rounded-full border-4"></div>{" "}
                      <p className="text-ink-soft font-medium">
                        {isLoading === "nodemailer"
                          ? "Sending magic link..."
                          : "Signing you in..."}
                      </p>
                    </div>
                  ) : providers ? (
                    (() => {
                      // Separate nodemailer provider from OAuth providers
                      const allProviders = Object.values(providers);
                      const emailProvider = restricted
                        ? undefined
                        : allProviders.find((p) => p.id === "nodemailer");
                      const oauthProviders = allProviders.filter(
                        (p) => p.id !== "nodemailer" && (!restricted || p.id === only),
                      );

                      // Keep OAuth providers in a consistent order (alphabetical by name)
                      const sortedOAuth = oauthProviders.sort((a, b) =>
                        a.name.localeCompare(b.name),
                      );

                      return (
                        <>
                          {/* Email provider with special form */}
                          {emailProvider && (
                            <div className="space-y-3">
                              {!showEmailForm ? (
                                <button
                                  onClick={() => setShowEmailForm(true)}
                                  disabled={isLoading !== null}
                                  className="btn-post w-full gap-3 disabled:opacity-50"
                                >
                                  <SafeIcon
                                    providerId="email"
                                    alt="Email logo"
                                    className="h-6 w-6 shadow-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                                  />
                                  <span className="font-medium">
                                    Continue with Email
                                  </span>
                                </button>
                              ) : (
                                <form
                                  onSubmit={handleEmailSubmit}
                                  className="space-y-3"
                                >
                                  <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    aria-label="Email address"
                                    className="rounded-label border-rule text-ink placeholder:text-ink-soft w-full border bg-white px-4 py-3"
                                    required
                                  />
                                  <div className="flex gap-2">
                                    {" "}
                                    <button
                                      type="submit"
                                      disabled={isLoading !== null || !email}
                                      className="btn-post flex-1 disabled:opacity-50"
                                    >
                                      {" "}
                                      {isLoading === "nodemailer" ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      ) : null}
                                      {isLoading === "nodemailer"
                                        ? "Sending..."
                                        : "Send Magic Link"}
                                    </button>{" "}
                                    <button
                                      type="button"
                                      disabled={isLoading !== null}
                                      onClick={() => {
                                        setShowEmailForm(false);
                                        setEmail("");
                                      }}
                                      className="btn-quiet text-ink-soft border-transparent disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              )}
                              {oauthProviders.length > 0 && (
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <span className="border-rule w-full border-t" />
                                  </div>
                                  <div className="relative flex justify-center text-sm">
                                    <span className="bg-label text-ink-soft px-2">
                                      Or continue with
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* OAuth providers */}
                          {sortedOAuth.map((provider) => {
                            const style =
                              providerStyles[provider.id] ??
                              "bg-gray-700 hover:bg-gray-800 text-white border border-gray-300";
                            return (
                              <button
                                key={provider.id}
                                onClick={() => handleSignIn(provider.id)}
                                disabled={isLoading !== null}
                                className={`rounded-label flex min-h-11 w-full items-center justify-center gap-3 px-4 py-3 font-semibold transition disabled:opacity-50 ${style}`}
                              >
                                {isLoading === provider.id ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <SafeIcon
                                    providerId={provider.id}
                                    alt={`${provider.name} logo`}
                                    className="h-6 w-6 shadow-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                                  />
                                )}
                                <span className="font-medium">
                                  {isLoading === provider.id
                                    ? "Signing in..."
                                    : `Continue with ${provider.name}`}
                                </span>
                              </button>
                            );
                          })}
                          {restricted && (
                            <button
                              type="button"
                              onClick={() => setShowAll(true)}
                              className="text-ink-soft w-full text-center text-sm underline underline-offset-4"
                            >
                              Already have an account? Sign in another way
                            </button>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    "Loading providers..."
                  )}
                </div>
                <p className="text-ink-soft mt-6 text-sm">
                  You need to be 16 or over. Our{" "}
                  <Link
                    href="/privacy"
                    className="text-post font-semibold underline underline-offset-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    privacy policy
                  </Link>{" "}
                  explains what we keep and why.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

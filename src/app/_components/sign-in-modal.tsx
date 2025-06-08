"use client";

import { getProviders, signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { clientLogger } from "~/utils/client-logger";

const logger = clientLogger;

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    return <div className={`${className} bg-gray-200 animate-pulse rounded`} />;
  }

  if (!dataUrl) {
    return (
      <div
        className={`${className} bg-gray-300 rounded flex items-center justify-center text-xs text-gray-500`}
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
    />  );
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [providers, setProviders] = useState<ProvidersState>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  React.useEffect(() => {
    if (isOpen) {
      void getProviders().then(setProviders);
    } else {
      // Reset states when modal is closed
      setEmailSent(false);
      setShowEmailForm(false);
      setEmail("");
      setIsLoading(null);
    }
  }, [isOpen]);
  const handleSignIn = async (providerId: string, email?: string) => {
    setIsLoading(providerId);
    try {
      if (providerId === "nodemailer" && email) {
        // Store email for the verify-request page as fallback
        localStorage.setItem("magic-link-email", email);
        const result = await signIn(providerId, { 
          email, 
          redirect: false,
          callbackUrl: window.location.origin 
        });
          // Check if sign-in was successful
        if (result?.error) {
          logger.error(result.error, "Magic link sign-in error", {
            providerId,
            email: email ?? undefined
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
      logger.error(error instanceof Error ? error.message : String(error), "Sign in error", {
        providerId,
        email: email ?? undefined
      });
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

  if (!isOpen) return null;
  // Provider button color mapping
  const providerStyles: Record<string, string> = {
    github: "bg-gray-800 hover:bg-gray-900 text-white border border-gray-300",
    google: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100",
    discord: "bg-[#5865F2] hover:bg-[#4752C4] text-white",
    twitch: "bg-[#9147FF] hover:bg-[#772CE8] text-white",
    reddit: "bg-[#FF4500] hover:bg-[#D73600] text-white",
    facebook: "bg-[#1877F3] hover:bg-[#145DB2] text-white",
    instagram:
      "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white border-0",    tiktok: "bg-black hover:bg-gray-900 text-white border-0",
    email: "bg-green-600 hover:bg-green-700 text-white border-0",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={() => {
            setEmailSent(false);
            setShowEmailForm(false);
            setEmail("");
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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
        </button>        {/* Modal content */}
        <div className="text-center">
          {emailSent ? (
            // Email sent success state
            <div className="space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
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
              <h2 className="text-2xl font-bold text-gray-900">
                Check your email
              </h2>

              {/* Description */}
              <div className="text-gray-600 space-y-2">
                <p>
                  We&apos;ve sent a magic link to{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
                <p className="text-sm">
                  Click the link in the email to sign in to your account.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-medium">Next steps:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Check your email inbox</li>
                    <li>Look for an email from our system</li>
                    <li>Click the &quot;Sign in&quot; link in the email</li>
                    <li>You&apos;ll be automatically signed in</li>
                  </ul>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <strong>Don&apos;t see the email?</strong> Check your spam folder.
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Send Another Link
                </button>
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setShowEmailForm(false);
                    setEmail("");
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Try Different Method
                </button>
              </div>
            </div>
          ) : (
            // Normal sign-in state
            <>
              <p className="mb-2 text-sm text-gray-600">
                Sign in with your favourite service
              </p>
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Sign in to your account
              </h2>
              <div className="space-y-3">
            {isLoading ? (
              // Show preloader when any authentication is in progress
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-red-600"></div>{" "}
                <p className="font-medium text-gray-600">
                  {isLoading === "nodemailer"
                    ? "Sending magic link..."
                    : "Signing you in..."}
                </p>
              </div>
            ) : providers ? (
              (() => {
                // Separate nodemailer provider from OAuth providers
                const allProviders = Object.values(providers);
                const emailProvider = allProviders.find(
                  (p) => p.id === "nodemailer",
                );
                const oauthProviders = allProviders.filter(
                  (p) => p.id !== "nodemailer",
                );

                // Keep OAuth providers in a consistent order (alphabetical by name)
                const sortedOAuth = oauthProviders.sort((a, b) => 
                  a.name.localeCompare(b.name)
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
                            className="flex w-full items-center justify-center gap-3 rounded-lg border-0 bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
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
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                              required
                            />
                            <div className="flex gap-2">
                              {" "}
                              <button
                                type="submit"
                                disabled={isLoading !== null || !email}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
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
                                className="px-4 py-3 font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                        {oauthProviders.length > 0 && (
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="bg-white px-2 text-gray-500">
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
                          className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium transition disabled:opacity-50 ${style}`}
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
                  </>
                );
              })()
            ) : (
              "Loading providers..."
            )}
              </div>
              <p className="mt-6 text-sm text-gray-500">
                By signing in, you agree to our terms of service and{" "}
                <Link
                  href="/privacy"
                  className="text-red-600 underline hover:text-red-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  privacy policy
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { signIn, getProviders } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

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

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [providers, setProviders] = useState<ProvidersState>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      void getProviders().then(setProviders);
    }
  }, [isOpen]);
  const handleSignIn = async (providerId: string, email?: string) => {
    setIsLoading(providerId);
    try {
      if (providerId === "email" && email) {
        await signIn(providerId, { email });
      } else {
        await signIn(providerId);
      }
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await handleSignIn("email", email);
    }
  };

  if (!isOpen) return null;

  // Provider button color mapping
  const providerStyles: Record<string, string> = {
    github: "bg-gray-800 hover:bg-gray-900 text-white border border-gray-300",
    google: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100",    discord: "bg-[#5865F2] hover:bg-[#4752C4] text-white",
    twitch: "bg-[#9147FF] hover:bg-[#772CE8] text-white",
    reddit: "bg-[#FF4500] hover:bg-[#D73600] text-white",
    facebook: "bg-[#1877F3] hover:bg-[#145DB2] text-white",
    instagram:
      "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white border-0",
    tiktok: "bg-black hover:bg-gray-900 text-white border-0",
    email: "bg-green-600 hover:bg-green-700 text-white border-0",
    sendgrid: "bg-blue-600 hover:bg-blue-700 text-white border-0",
    resend: "bg-purple-600 hover:bg-purple-700 text-white border-0",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
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
        <div className="text-center">
          <p className="mb-2 text-sm text-gray-600">
            Sign in with your favourite service
          </p>
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Sign in to your account
          </h2>          <div className="space-y-3">
            {providers
              ? (() => {
                  // Separate email provider from OAuth providers
                  const allProviders = Object.values(providers);
                  const emailProvider = allProviders.find(p => p.id === "email");
                  const oauthProviders = allProviders.filter(p => p.id !== "email");
                  
                  // Randomize OAuth providers order
                  const shuffledOAuth = oauthProviders.sort(() => Math.random() - 0.5);
                  
                  return (
                    <>
                      {/* Email provider with special form */}
                      {emailProvider && (
                        <div className="space-y-3">
                          {!showEmailForm ? (
                            <button
                              onClick={() => setShowEmailForm(true)}
                              className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium transition bg-green-600 hover:bg-green-700 text-white border-0"
                            >
                              <Image
                                src={`https://authjs.dev/img/providers/email.svg`}
                                alt="Email logo"
                                height={24}
                                width={24}
                                className="h-6 w-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] shadow-white"
                                loading="lazy"
                              />
                              <span className="font-medium">Continue with Email</span>
                            </button>
                          ) : (
                            <form onSubmit={handleEmailSubmit} className="space-y-3">
                              <input
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                              />
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={isLoading === "email" || !email}
                                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                                >
                                  {isLoading === "email" ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : null}
                                  {isLoading === "email" ? "Sending..." : "Send Magic Link"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowEmailForm(false);
                                    setEmail("");
                                  }}
                                  className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium"
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
                                <span className="bg-white px-2 text-gray-500">Or continue with</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* OAuth providers */}
                      {shuffledOAuth.map((provider) => {
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
                              <Image
                                src={`https://authjs.dev/img/providers/${provider.id}.svg`}
                                alt={`${provider.name} logo`}
                                height={24}
                                width={24}
                                className="h-6 w-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] shadow-white"
                                loading="lazy"
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
              : "Loading providers..."}
          </div>
          <p className="mt-6 text-sm text-gray-500">
            By signing in, you agree to our terms of service and{" "}
            <Link
              href="/privacy"
              className="text-red-600 hover:text-red-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

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

  React.useEffect(() => {
    if (isOpen) {
      void getProviders().then(setProviders);
    }
  }, [isOpen]);

  const handleSignIn = async (providerId: string) => {
    setIsLoading(providerId);
    try {
      await signIn(providerId);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(null);
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
      "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white border-0",
    tiktok: "bg-black hover:bg-gray-900 text-white border-0",
    email: "bg-green-600 hover:bg-green-700 text-white border-0",
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
          </h2>
          <div className="space-y-3">
            {providers
              ? (() => {
                  // Randomize providers order
                  const shuffled = Object.values(providers).sort(
                    () => Math.random() - 0.5
                  );                  return shuffled.map((provider) => {
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
                  });
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

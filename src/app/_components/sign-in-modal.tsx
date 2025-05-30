"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      if (provider === "debug") {
        // Handle debug login
        const response = await fetch("/api/debug-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          // Redirect to force session refresh
          window.location.reload();
        } else {
          console.error("Debug login failed");
        }
      } else {
        await signIn(provider);
      }
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(null);
    }
  };

  if (!isOpen) return null;

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
        </button>        {/* Modal content */}
        <div className="text-center">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Sign in to your account
          </h2>

          <div className="space-y-3">
            {/* Debug Login Button - Only in development */}
            {process.env.NODE_ENV === "development" && (
              <>
                <button
                  onClick={() => handleSignIn("debug")}
                  disabled={isLoading !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50 px-4 py-3 text-yellow-800 transition hover:bg-yellow-100 disabled:opacity-50"
                >
                  {isLoading === "debug" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-800 border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  )}
                  <span className="font-medium">
                    {isLoading === "debug" ? "Signing in..." : "🛠️ Debug Login (Dev Only)"}
                  </span>
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">or continue with</span>
                  </div>
                </div>
              </>
            )}
            {/* Discord Sign In Button */}
            <button
              onClick={() => handleSignIn("discord")}
              disabled={isLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-[#5865F2] px-4 py-3 text-white transition hover:bg-[#4752C4] disabled:opacity-50"
            >
              {isLoading === "discord" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              )}
              <span className="font-medium">
                {isLoading === "discord" ? "Signing in..." : "Continue with Discord"}
              </span>
            </button>

            {/* Twitch Sign In Button */}
            <button
              onClick={() => handleSignIn("twitch")}
              disabled={isLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-[#9146FF] px-4 py-3 text-white transition hover:bg-[#772CE8] disabled:opacity-50"
            >
              {isLoading === "twitch" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
              )}
              <span className="font-medium">
                {isLoading === "twitch" ? "Signing in..." : "Continue with Twitch"}
              </span>
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

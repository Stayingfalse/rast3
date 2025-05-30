"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Example static list (expand as needed or load from config)
const STATIC_WORK_DOMAINS = [
  "sensee.co.uk",
  "bupa.com",
];

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showLoops, setShowLoops] = useState(false);
  const [loopsEmail, setLoopsEmail] = useState("");
  const [loopsSent, setLoopsSent] = useState(false);
  const [loopsError, setLoopsError] = useState<string | null>(null);
  const [loopsWarning, setLoopsWarning] = useState<string | null>(null);

  // Remove tRPC domain.getAll for signed-out users
  // const { data: domains } = api.domain.getAll.useQuery(undefined, { enabled: isOpen });
  // const knownDomains = (domains || []).map((d: any) => d.name?.toLowerCase?.()).filter(Boolean);
  const knownDomains = STATIC_WORK_DOMAINS;

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider);
    try {
      await signIn(provider);
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(null);
    }
  };

  // Loops magic link logic
  const handleLoopsSend = async () => {
    setLoopsError(null);
    setLoopsSent(false);
    setIsLoading("loops");
    try {
      // Use NextAuth's Loops provider for magic link
      const result = await signIn("loops", {
        email: loopsEmail,
        redirect: false,
      });
      if (result?.error) {
        setLoopsError(result.error);
        setIsLoading(null);
      } else {
        setLoopsSent(true);
        setIsLoading(null);
      }
    } catch (err: any) {
      setLoopsError("Failed to send magic link. Please try again.");
      setIsLoading(null);
    }
  };

  // Check for work domain warning
  useEffect(() => {
    if (!loopsEmail.includes("@")) {
      setLoopsWarning(null);
      return;
    }
    const domain = loopsEmail.split("@")[1]?.toLowerCase?.();
    if (domain && knownDomains.includes(domain)) {
      setLoopsWarning(
        "Please do not use your work email. Magic links may not be delivered to work addresses due to admin controls."
      );
    } else {
      setLoopsWarning(null);
    }
  }, [loopsEmail, knownDomains]);

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
        </button>
        {/* Modal content */}
        <div className="text-center">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Sign in to your account
          </h2>

          {/* Magic Link Login always visible at the top */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleLoopsSend();
            }}
            className="space-y-2 mb-4"
          >
            <input
              type="email"
              required
              autoFocus
              placeholder="Enter your PERSONAL email address"
              value={loopsEmail}
              onChange={e => setLoopsEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading === "loops" || loopsSent}
            />
            {loopsWarning && (
              <div className="rounded bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 text-xs mt-1">
                {loopsWarning}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading === "loops" || loopsSent}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-[#7C3AED] px-4 py-2 text-white transition hover:bg-[#5B21B6] disabled:opacity-50"
            >
              {isLoading === "loops" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M16 12v1a4 4 0 01-8 0v-1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 16v2m0-6V6m0 0L8 10m4-4l4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className="font-medium">
                {loopsSent ? "Magic Link Sent!" : "Send Magic Link"}
              </span>
            </button>
            {loopsSent && (
              <div className="text-green-600 text-xs pt-2">Check your inbox for a magic link to sign in.</div>
            )}
            {loopsError && (
              <div className="text-red-600 text-xs pt-2">{loopsError}</div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              <span>
                If you use a work email, you may not receive the magic link due to organization restrictions.
              </span>
            </div>
          </form>

          {/* Separator */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-4 text-gray-400 text-sm font-medium">-- or --</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <div className="space-y-3">
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
            
            {/* Google Sign In Button */}
            <button
              onClick={() => handleSignIn("google")}
              disabled={isLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 transition hover:bg-gray-50 disabled:opacity-50 shadow-sm"
            >
              {isLoading === "google" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-800 border-t-transparent" />
              ) : (
                // Google SVG logo
                <svg className="h-5 w-5" viewBox="0 0 48 48">
                  <g>
                    <path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.2 3.2-4.2 5.5-7.8 5.5-4.7 0-8.5-3.8-8.5-8.5s3.8-8.5 8.5-8.5c2.1 0 4 .7 5.5 2l6.1-6.1C36.2 9.1 30.4 7 24 7 13.5 7 5 15.5 5 26s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.5-.4-3.5z"/>
                    <path fill="#34A853" d="M24 45c5.4 0 9.9-1.8 13.2-4.8l-6.1-6.1c-1.7 1.2-3.9 2-6.1 2-4.7 0-8.5-3.8-8.5-8.5H5v5.3C8.3 40.2 15.5 45 24 45z"/>
                    <path fill="#FBBC05" d="M15.5 27.6c-.4-1.2-.6-2.5-.6-3.6s.2-2.5.6-3.6V15H5c-1.1 2.2-1.7 4.7-1.7 7.5s.6 5.3 1.7 7.5l10.5-7.4z"/>
                    <path fill="#EA4335" d="M24 14.5c2.6 0 4.9.9 6.7 2.6l5-5C33.9 9.1 29.2 7 24 7c-8.5 0-15.7 4.8-19 11.7l10.5 7.4c1.2-3.7 4.7-6.6 8.5-6.6z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </g>
                </svg>
              )}
              <span className="font-medium">
                {isLoading === "google" ? "Signing in..." : "Continue with Google"}
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

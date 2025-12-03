"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function MagicLandingClient() {
  const search = useSearchParams();
  const url = search.get("url") ?? "";
  const [safeUrl, setSafeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setSafeUrl(null);
      return;
    }
    try {
      // Basic validation: ensure it's an absolute URL and uses http(s)
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        setSafeUrl(url);
        return;
      }
    } catch {
      // invalid URL
    }
    setSafeUrl(null);
  }, [url]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mx-auto mb-6 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3.536 3.536a4 4 0 01-5.656-5.656l1.414-1.414" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 010-5.656l3.536-3.536a4 4 0 015.656 5.656l-1.414 1.414" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in</h1>

        <p className="text-gray-600 mb-6">
          For security, please click the button below to complete your sign in. If the
          button does not work, copy and paste the link into your browser address bar.
        </p>

        {safeUrl ? (
          <div className="space-y-4">
            <a
              href={safeUrl}
              className="inline-block w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Click to Sign In
            </a>

            <div className="text-sm text-gray-500">
              <div className="mb-1">Cannot click the button?</div>
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-blue-600">Show the sign-in URL</summary>
                <div className="mt-2 break-words text-xs text-gray-700">{safeUrl}</div>
              </details>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-yellow-800">No valid sign-in link found. Please use the link from your email.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          If you did not request this link, you can ignore this email.
        </div>
      </div>
    </div>
  );
}

export default MagicLandingClient;

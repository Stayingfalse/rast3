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
    <div className="flex w-full items-center justify-center">
      <div className="label-stock w-full max-w-lg p-8 text-center">
        <div className="bg-label-shade mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="text-post h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 010 5.656l-3.536 3.536a4 4 0 01-5.656-5.656l1.414-1.414"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.172 13.828a4 4 0 010-5.656l3.536-3.536a4 4 0 015.656 5.656l-1.414 1.414"
            />
          </svg>
        </div>

        <h1 className="font-expanded text-ink mb-4 text-2xl font-extrabold">
          Sign in
        </h1>

        <p className="text-ink-soft mb-6">
          For security, please click the button below to complete your sign in.
          If the button does not work, copy and paste the link into your browser
          address bar.
        </p>

        {safeUrl ? (
          <div className="space-y-4">
            <a href={safeUrl} className="btn-post w-full">
              Click to Sign In
            </a>

            <div className="text-ink-soft text-sm">
              <div className="mb-1">Cannot click the button?</div>
              <details className="text-left">
                <summary className="text-post cursor-pointer text-sm">
                  Show the sign-in URL
                </summary>
                <div className="text-ink-soft mt-2 text-xs break-words">
                  {safeUrl}
                </div>
              </details>
            </div>
          </div>
        ) : (
          <div className="rounded-label border-rule bg-label-shade border p-4">
            <p className="text-ink">
              No valid sign-in link found. Please use the link from your email.
            </p>
          </div>
        )}

        <div className="border-rule text-ink-soft mt-8 border-t pt-6 text-sm">
          If you did not request this link, you can ignore this email.
        </div>
      </div>
    </div>
  );
}

export default MagicLandingClient;

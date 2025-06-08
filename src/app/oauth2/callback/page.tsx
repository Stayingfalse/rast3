"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { clientLogger } from "~/utils/client-logger";

const logger = clientLogger;

function OAuth2CallbackContent() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    // If this is an admin email setup flow, redirect back to settings page
    if (state === "admin_email_setup") {
      const params = new URLSearchParams();
      if (code) params.set("code", code);
      if (error) params.set("error", error);
      if (state) params.set("state", state);

      // Redirect to admin settings page with parameters
      window.location.href = `/admin/settings?${params.toString()}`;
      return;
    }

    // Legacy popup handling for other OAuth2 flows
    if (window.opener) {
      if (error) {
        (window.opener as Window).postMessage(
          {
            type: "oauth2-error",
            error: error,
            errorDescription: searchParams.get("error_description"),
          },
          window.location.origin,
        );
      } else if (code) {
        (window.opener as Window).postMessage(
          {
            type: "oauth2-success",
            code: code,
            state: state,
          },
          window.location.origin,
        );      }

      // Close the popup window
      window.close();
    } else {
      // If no opener and not admin flow, something went wrong
      logger.error("OAuth2 callback received but no parent window found", "OAuth2 callback error", {
        hasCode: !!code,
        hasError: !!error,
        state: state ?? undefined,
        userAgent: navigator.userAgent
      });
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="rounded-lg border border-white/20 bg-white/10 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>{" "}
        <h1 className="mb-2 text-xl font-semibold text-white">
          Processing Gmail Authorization...
        </h1>
        <p className="text-white/70">
          Please wait while we complete the Gmail authorization process for
          email sending.
        </p>
        <p className="mt-4 text-sm text-white/50">
          You will be redirected back to the admin settings page.
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="rounded-lg border border-white/20 bg-white/10 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <h1 className="mb-2 text-xl font-semibold text-white">Loading...</h1>
        <p className="text-white/70">Preparing authentication process.</p>
      </div>
    </div>
  );
}

export default function OAuth2CallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuth2CallbackContent />
    </Suspense>
  );
}

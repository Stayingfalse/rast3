"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const provider = searchParams.get("provider");
  const type = searchParams.get("type");

  useEffect(() => {
    // Extract email from URL if present, or from localStorage as fallback
    const urlEmail = searchParams.get("email");
    if (urlEmail) {
      setEmail(urlEmail);
    } else {
      // Try to get the last submitted email from localStorage
      const savedEmail = localStorage.getItem("magic-link-email");
      if (savedEmail) {
        setEmail(savedEmail);
        // Clear it after use
        localStorage.removeItem("magic-link-email");
      }
    }
  }, [searchParams]);

  const isEmailProvider = provider === "nodemailer" && type === "email";

  return (
    <div className="flex w-full items-center justify-center">
      <div className="label-stock w-full max-w-md p-8 text-center">
        {/* Success Icon */}
        <div className="bg-pine-tint mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="text-pine h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-expanded text-ink mb-4 text-2xl font-extrabold">
          Check your email
        </h1>

        {/* Description */}
        <div className="text-ink-soft mb-6 space-y-2">
          {isEmailProvider ? (
            <>
              {" "}
              <p>
                We&apos;ve sent a magic link to{" "}
                {email && <span className="text-ink font-medium">{email}</span>}
              </p>
              <p className="text-sm">
                Click the link in the email to sign in to your account.
              </p>
            </>
          ) : (
            <p>
              A sign-in link has been sent to your email address. Please check
              your email and click the link to continue.
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-label-shade border-rule rounded-label mb-6 border p-4">
          <div className="text-ink space-y-2 text-sm">
            <p className="font-medium">Next steps:</p>
            <ul className="list-inside list-disc space-y-1 text-left">
              <li>Check your email inbox</li>
              <li>Look for an email from our system</li>{" "}
              <li>Click the &quot;Sign in&quot; link in the email</li>
              <li>You&apos;ll be automatically signed in</li>
            </ul>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="text-ink-soft mb-6 space-y-2 text-xs">
          {" "}
          <p>
            <strong>Don&apos;t see the email?</strong> Check your spam folder or
            try requesting a new link.
          </p>
          <p>The link will expire in 24 hours for security reasons.</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link href="/" className="btn-post w-full">
            Return to Home
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="btn-quiet text-ink w-full"
          >
            Request New Link
          </button>
        </div>

        {/* Footer */}
        <div className="border-rule mt-8 border-t pt-6">
          <p className="text-ink-soft text-xs">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>{" "}
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center py-16">
          <div className="border-post h-32 w-32 animate-spin rounded-full border-b-2"></div>
        </div>
      }
    >
      <VerifyRequestContent />
    </Suspense>
  );
}

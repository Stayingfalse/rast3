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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
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
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Check your email
        </h1>

        {/* Description */}
        <div className="text-gray-600 mb-6 space-y-2">
          {isEmailProvider ? (
            <>              <p>
                We&apos;ve sent a magic link to{" "}
                {email && (
                  <span className="font-medium text-gray-900">{email}</span>
                )}
              </p><p className="text-sm">
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-800 space-y-2">
            <p className="font-medium">Next steps:</p>
            <ul className="text-left space-y-1 list-disc list-inside">
              <li>Check your email inbox</li>
              <li>Look for an email from our system</li>              <li>Click the &quot;Sign in&quot; link in the email</li>
              <li>You&apos;ll be automatically signed in</li>
            </ul>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="text-xs text-gray-500 space-y-2 mb-6">          <p>
            <strong>Don&apos;t see the email?</strong> Check your spam folder or try
            requesting a new link.
          </p>
          <p>The link will expire in 24 hours for security reasons.</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Return to Home
          </Link>
          
          <button
            onClick={() => window.location.reload()}
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Request New Link
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    }>
      <VerifyRequestContent />
    </Suspense>
  );
}

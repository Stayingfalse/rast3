"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

interface CookieConsentProps {
  className?: string;
}

type ConsentStatus = "pending" | "accepted" | "declined";

const CONSENT_COOKIE_NAME = "cookie-consent";
const CONSENT_EXPIRY_DAYS = 365;

export const CookieConsent: React.FC<CookieConsentProps> = ({
  className = "",
}) => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [isVisible, setIsVisible] = useState(false);

  // Check existing consent on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const existingConsent = getCookieConsent();
      if (existingConsent) {
        setConsentStatus(existingConsent);
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    }
  }, []);

  const getCookieConsent = (): ConsentStatus | null => {
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";");
    const consentCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${CONSENT_COOKIE_NAME}=`),
    );

    if (consentCookie) {
      const value = consentCookie.split("=")[1]?.trim();
      return (value as ConsentStatus) || null;
    }

    return null;
  };

  const setCookieConsent = (status: ConsentStatus) => {
    if (typeof document === "undefined") return;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRY_DAYS);

    document.cookie = `${CONSENT_COOKIE_NAME}=${status}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  };

  const handleAccept = () => {
    setConsentStatus("accepted");
    setCookieConsent("accepted");
    setIsVisible(false);

    // Initialize analytics or other tracking scripts here if needed
    // Example: window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
  };

  const handleDecline = () => {
    setConsentStatus("declined");
    setCookieConsent("declined");
    setIsVisible(false);

    // Clear any existing tracking cookies if needed
    // Example: Clear Google Analytics cookies, etc.
    clearNonEssentialCookies();
  };

  const clearNonEssentialCookies = () => {
    if (typeof document === "undefined") return;

    // List of non-essential cookie patterns to clear
    const nonEssentialPatterns = [
      "_ga",
      "_gid",
      "_gat", // Google Analytics
      "_fbp",
      "_fbc", // Facebook Pixel
      "__utm", // UTM tracking
      // Add other tracking cookie patterns as needed
    ];

    // Clear cookies that match non-essential patterns
    const cookies = document.cookie.split(";");
    cookies.forEach((cookie) => {
      const cookieName = cookie.split("=")[0]?.trim();
      if (cookieName) {
        const shouldClear = nonEssentialPatterns.some((pattern) =>
          cookieName.startsWith(pattern),
        );

        if (shouldClear) {
          // Clear cookie by setting it to expire in the past
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      }
    });
  };

  // Don't render if consent has been given or declined
  if (!isVisible || consentStatus !== "pending") {
    return null;
  }

  return (
    <div
      className={`fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white shadow-lg ${className}`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              🍪 Cookie Consent
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              We use essential cookies to make our site work. We&apos;d also
              like to use optional cookies to enhance your experience and help
              us improve our services. You can manage your preferences below.{" "}
              <Link
                href="/privacy"
                className="text-red-600 underline hover:text-red-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more in our Privacy Policy
              </Link>
            </p>
          </div>

          <div className="flex min-w-fit flex-col gap-2 sm:flex-row">
            <button
              onClick={handleDecline}
              className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Decline Optional
            </button>
            <button
              onClick={handleAccept}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Accept All
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <p>
            <strong>Essential cookies</strong> are always enabled to ensure the
            site functions properly.
            <strong> Optional cookies</strong> include analytics and
            personalization features.
          </p>
        </div>
      </div>
    </div>
  );
};

// Utility function to check if user has consented to cookies
export const hasConsentedToCookies = (): boolean => {
  if (typeof document === "undefined") return false;

  const cookies = document.cookie.split(";");
  const consentCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${CONSENT_COOKIE_NAME}=`),
  );

  if (consentCookie) {
    const value = consentCookie.split("=")[1]?.trim();
    return value === "accepted";
  }

  return false;
};

// Utility function to check if user has made any consent choice
export const hasChosenCookieConsent = (): boolean => {
  if (typeof document === "undefined") return false;

  const cookies = document.cookie.split(";");
  const consentCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${CONSENT_COOKIE_NAME}=`),
  );

  return !!consentCookie;
};

export default CookieConsent;

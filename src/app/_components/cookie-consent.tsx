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
    <section
      aria-label="Cookie preferences"
      className={`border-rule bg-label text-ink shadow-lift fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-center sm:gap-6 ${className}`}
    >
      <p className="text-ink text-sm leading-snug">
        <strong>Cookies.</strong> Essential ones keep you signed in. With your
        OK we&apos;d also use optional ones for analytics.{" "}
        <Link
          href="/privacy"
          className="text-post font-semibold underline underline-offset-4"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy policy
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="btn-post min-h-9 flex-1 py-1.5 text-sm sm:flex-none"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={handleDecline}
          className="btn-quiet text-ink min-h-9 flex-1 py-1.5 text-sm sm:flex-none"
        >
          Decline Optional
        </button>
      </div>
    </section>
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

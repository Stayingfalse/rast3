import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Archivo } from "next/font/google";
import { Toaster } from "react-hot-toast";

import { SessionProvider } from "next-auth/react";
import { getSession } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";
import { AddToHomeScreen } from "./_components/add-to-home-screen";
import { SiteFooter } from "./_components/site-footer";
import AdminButton from "./_components/admin-button";
import { Sky } from "./_components/post/sky";
import AuthButton from "./_components/auth-button";
import { CookieConsent } from "./_components/cookie-consent";
import { ServiceWorkerRegistration } from "./_components/service-worker-registration";
import WishlistReportsAlert from "./_components/wishlist-reports-alert";

// Archivo across its width axis: expanded caps for the franked wordmark and
// labels, regular width for reading.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Random Acts of Santa 2026",
  description:
    "Send a colleague a Christmas gift without ever knowing their address. Share your Amazon wishlist, pick up a few of theirs whenever you're ready, and say thank you with kudos. No draw, no pressure.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://raosanta.uk"),
  openGraph: {
    title: "Random Acts of Santa 2026",
    description:
      "Send a colleague a Christmas gift without ever knowing their address. No draw, no pressure.",
    url: "/",
    siteName: "Random Acts of Santa",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Random Acts of Santa 2026",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RAoSanta",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#13264d",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // the session goes to the browser with the page, so nothing waits to ask
  // for it again (and there's one provider, not two)
  const session = await getSession();
  return (
    <html lang="en" className={`${archivo.variable}`} suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RAoSanta" />
        <meta name="application-name" content="RAoSanta" />
        <meta name="msapplication-TileColor" content="#13264d" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Additional Icon Links for better compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <SessionProvider session={session}>
        <body>
          {" "}
          <main className="bg-night relative z-10 flex min-h-screen flex-col items-center overflow-x-clip bg-[url('/plaid.png')] bg-fixed bg-top bg-repeat">
            {/* Admin Button (top right) */}
            <AdminButton />
            {/* Auth Button (top right, shows when not admin) */}
            <AuthButton />
            {/* The hanging post across the top of the night sky (decorative) */}
            <Sky />{" "}
            <div className="relative flex w-full max-w-6xl flex-col items-center gap-16 px-4 pt-[164px] pb-24 sm:px-6 sm:pt-[236px]">
              <WishlistReportsAlert />
              <TRPCReactProvider>{children}</TRPCReactProvider>{" "}
            </div>{" "}
            <SiteFooter />
            {/* Cookie Consent Banner */}
            <CookieConsent />
            {/* Add to Home Screen Prompt */}
            <AddToHomeScreen />
            {/* Service Worker Registration */}
            <ServiceWorkerRegistration />
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#f6f0e2",
                  color: "#18223a",
                  border: "1px solid #cdbf9f",
                  borderRadius: "0.375rem",
                  fontWeight: 500,
                },
              }}
            />
          </main>
        </body>
      </SessionProvider>
    </html>
  );
}

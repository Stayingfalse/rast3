import { type Metadata, type Viewport } from "next"
import { Inter } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { Toaster } from "react-hot-toast"

import { SessionProvider } from "next-auth/react"
import { TRPCReactProvider } from "~/trpc/react"
import { AddToHomeScreen } from "./_components/add-to-home-screen"
import AdminButton from "./_components/admin-button"
import AuthButton from "./_components/auth-button"
import { AuthProvider } from "./_components/auth-provider"
import { CookieConsent } from "./_components/cookie-consent"
import { ServiceWorkerRegistration } from "./_components/service-worker-registration"
import StopImpersonation from "./_components/stop-impersonation"
import WishlistReportsAlert from "./_components/wishlist-reports-alert"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Random Acts of Santa 2025",
  description:
    "Bring Secret Santa to remote teams! Anonymous gift exchanges made simple for home workers. Share Amazon wishlists, spread Christmas cheer, no addresses needed.",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RAoSanta",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a1c40",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RAoSanta" />
        <meta name="application-name" content="RAoSanta" />
        <meta name="msapplication-TileColor" content="#13264D" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Additional Icon Links for better compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <SessionProvider>
        <body>
          {" "}
          <main className="bg-#13264D relative z-10 flex min-h-screen flex-col items-center justify-center bg-[url('/plaid.png')] bg-fixed bg-top bg-repeat">
            {/* Admin Button (top right) */}
            <AdminButton />
            {/* Auth Button (top right, shows when not admin) */}
            <AuthButton />
            {/* Header with SVG image */}
            <header className="pointer-events-none absolute top-[-0.5rem] left-1/2 z-0 flex w-full max-w-[150%] -translate-x-1/2 justify-center select-none">
              <Link href="/">
                <Image
                  src="/header.svg"
                  alt="Header Logo"
                  width={800}
                  height={200}
                  className="z-0 h-auto w-full"
                  draggable="false"
                  priority
                />
              </Link>
            </header>{" "}
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
              <WishlistReportsAlert />
              <AuthProvider>
                <TRPCReactProvider>{children}</TRPCReactProvider>
              </AuthProvider>{" "}
            </div>            {/* Cookie Consent Banner */}
            <CookieConsent />
            {/* Add to Home Screen Prompt */}
            <AddToHomeScreen />
            {/* Service Worker Registration */}
            <ServiceWorkerRegistration />
            {/* Stop Impersonation Control */}
            <StopImpersonation />
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#1f2937",
                  color: "#f9fafb",
                  border: "1px solid #374151",
                },
              }}
            />
          </main>
        </body>
      </SessionProvider>
    </html>
  );
}

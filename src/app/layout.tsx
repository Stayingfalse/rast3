import "~/styles/globals.css";

import { Inter } from "next/font/google";
import { type Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Toaster } from "react-hot-toast";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthProvider } from "./_components/auth-provider";
import AdminButton from "./_components/admin-button";
import AuthButton from "./_components/auth-button";
import { CookieConsent } from "./_components/cookie-consent";
import { SessionProvider } from "next-auth/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Random Acts of Santa 2025",
  description: "Bring Secret Santa to remote teams! Anonymous gift exchanges made simple for home workers. Share Amazon wishlists, spread Christmas cheer, no addresses needed.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <SessionProvider>
        <body>          <main className="relative z-10 flex min-h-screen flex-col items-center justify-center bg-[url('/plaid.png')] bg-top bg-repeat bg-fixed bg-#13264D">
            {/* Admin Button (top right) */}
            <AdminButton />
            {/* Auth Button (top right, shows when not admin) */}
            <AuthButton />
            {/* Header with SVG image */}
            <header className="absolute left-1/2 top-[-0.5rem] max-w-[150%] -translate-x-1/2 z-0 w-full flex justify-center pointer-events-none select-none">
              <Link href="/">
                <Image
                  src="/header.svg"
                  alt="Header Logo"
                  width={800}
                  height={200}
                  className="w-full h-auto z-0"
                  draggable="false"
                  priority
                />
              </Link>
            </header>            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
              <AuthProvider>
                <TRPCReactProvider>{children}</TRPCReactProvider>
              </AuthProvider>            </div>
            {/* Cookie Consent Banner */}
            <CookieConsent />
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                },
              }}
            />
          </main>
        </body>
      </SessionProvider>
    </html>
  );
}

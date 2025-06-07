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
  description:
    "Bring Secret Santa to remote teams! Anonymous gift exchanges made simple for home workers. Share Amazon wishlists, spread Christmas cheer, no addresses needed.",
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
              <AuthProvider>
                <TRPCReactProvider>{children}</TRPCReactProvider>
              </AuthProvider>{" "}
            </div>
            {/* Cookie Consent Banner */}
            <CookieConsent />
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

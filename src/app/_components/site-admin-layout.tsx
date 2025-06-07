"use client";

import { AdminLayout } from "~/app/_components/admin-layout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

interface SiteAdminLayoutProps {
  children: React.ReactNode;
}

export function SiteAdminLayout({ children }: SiteAdminLayoutProps) {
  const router = useRouter();
  const { data: sessionData, status } = useSession();
  const { data: user, isLoading } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user },
  );

  // Redirect logic in useEffect (client only)
  useEffect(() => {
    if (status === "loading" || isLoading) return; // Wait for session and user to load

    // Not logged in
    if (!sessionData?.user) {
      router.replace("/");
      return;
    }

    // Not a SITE admin
    if (user && user.adminLevel !== "SITE") {
      router.replace("/admin");
    }
  }, [status, isLoading, sessionData, user, router]);

  // Show loading spinner while loading session or user
  if (status === "loading" || isLoading || !user) {
    return (
      <div className="flex w-full items-center justify-center bg-[var(--blueZodiac)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-purple-500" />
      </div>
    );
  }

  // Only render children if user is a SITE admin
  if (user.adminLevel !== "SITE") {
    // Optionally, show nothing or a spinner while redirecting
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

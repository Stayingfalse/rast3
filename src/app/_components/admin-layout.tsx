"use client";

import { AdminSidebar } from "~/app/_components/admin-sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { data: sessionData, status } = useSession();
  const { data: user, isLoading } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  );

  // Redirect logic in useEffect (client only)
  useEffect(() => {
    if (status === "loading" || isLoading) return; // Wait for session and user to load

    // Not logged in
    if (!sessionData?.user) {
      router.replace("/");
      return;
    }

    // Not an admin
    if (user && !["DEPARTMENT", "DOMAIN", "SITE"].includes(user.adminLevel || "")) {
      router.replace("/");
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

  // Only render children if user is an admin
  if (!["DEPARTMENT", "DOMAIN", "SITE"].includes(user.adminLevel || "")) {
    // Optionally, show nothing or a spinner while redirecting
    return null;
  }

  return (
    <div className="relative w-full">
      <div className="flex w-full pt-24">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

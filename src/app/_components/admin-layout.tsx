"use client";

import { AdminSidebar } from "~/app/_components/admin-sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { data: user, isLoading } = api.profile.getCurrentProfile.useQuery();

  useEffect(() => {
    if (!isLoading && user && user.adminLevel === "USER") {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--blueZodiac)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-purple-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="flex h-screen w-full pt-24">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

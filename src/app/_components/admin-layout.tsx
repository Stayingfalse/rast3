"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminSidebar } from "~/app/_components/admin-sidebar";
import { api } from "~/trpc/react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { data: sessionData, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: user, isLoading } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user },
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [sidebarOpen]);

  // Redirect logic in useEffect (client only)
  useEffect(() => {
    if (status === "loading" || isLoading) return; // Wait for session and user to load

    // Not logged in
    if (!sessionData?.user) {
      router.replace("/");
      return;
    }

    // Not an admin
    if (
      user &&
      !["DEPARTMENT", "DOMAIN", "SITE"].includes(user.adminLevel || "")
    ) {
      router.replace("/");
    }
  }, [status, isLoading, sessionData, user, router]);
  // Show loading spinner while loading session or user
  if (status === "loading" || isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--blueZodiac)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-purple-500" />
      </div>
    );
  }

  // Only render children if user is an admin
  if (!["DEPARTMENT", "DOMAIN", "SITE"].includes(user.adminLevel || "")) {
    // Optionally, show nothing or a spinner while redirecting
    return null;
  }  return (
    <div className="relative min-h-screen w-full bg-[var(--blueZodiac)]">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <AdminSidebar />
      </div>      {/* Mobile header with dropdown menu */}
      <div className="lg:hidden" ref={dropdownRef}>
        <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm shadow-sm">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-white hover:bg-white/10 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="text-sm font-medium">Menu</span>
              <ChevronDownIcon 
                className={`h-4 w-4 transition-transform duration-200 ${sidebarOpen ? 'rotate-180' : ''}`} 
                aria-hidden="true" 
              />
            </button>
          </div>
          
          {/* Mobile dropdown menu */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="border-t border-white/10 bg-black/95 backdrop-blur-sm">
              <AdminSidebar onClose={() => setSidebarOpen(false)} mobile />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="w-full">
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

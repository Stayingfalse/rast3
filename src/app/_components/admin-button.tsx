"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";

export default function AdminButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Show nothing if not authenticated or loading
  if (status !== "authenticated" || !session?.user) return null;

  // Check for admin role (USER, DEPARTMENT, DOMAIN, SITE)
  const adminLevels = ["DEPARTMENT", "DOMAIN", "SITE"];
  const userAdminLevel = session.user.adminLevel;
  if (!adminLevels.includes(userAdminLevel)) return null;

  return (
    <button
      onClick={() => router.push("/admin")}
      className="fixed top-4 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white font-semibold px-4 py-2 rounded-lg shadow-xl border border-blue-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      title="Go to Admin Dashboard"
    >
      <ShieldCheckIcon className="w-5 h-5 text-blue-200 drop-shadow" aria-hidden="true" />
      <span>Admin</span>
    </button>
  );
}

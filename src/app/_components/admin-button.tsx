"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";

// Helper to read cookie presence on client
function getPreviewCookie() {
  try {
    return document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("impersonate_preview="));
  } catch (e) {
    return undefined;
  }
}

export default function AdminButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [previewName, setPreviewName] = useState<string | null>(null);

  // Show nothing if not authenticated or loading
  if (status !== "authenticated" || !session?.user) return null;

  // Check for admin role (USER, DEPARTMENT, DOMAIN, SITE)
  const adminLevels = ["DEPARTMENT", "DOMAIN", "SITE"];
  const userAdminLevel = session.user.adminLevel;
  if (!userAdminLevel || !adminLevels.includes(userAdminLevel)) return null;

  useEffect(() => {
    const match = getPreviewCookie();
    if (match) {
      const val = decodeURIComponent(match.split("=")[1] ?? "");
      setPreviewName(val || null);
    }
  }, []);

  return (
    <div className="fixed top-4 right-6 z-50 flex items-center gap-2">
      <button
        onClick={() => router.push("/admin")}
        className="flex items-center gap-2 rounded-lg border border-blue-900 bg-gradient-to-r from-blue-700 to-blue-900 px-4 py-2 font-semibold text-white shadow-xl transition-colors duration-150 hover:from-blue-800 hover:to-blue-950 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
        title="Go to Admin Dashboard"
      >
        <ShieldCheckIcon
          className="h-5 w-5 text-blue-200 drop-shadow"
          aria-hidden="true"
        />
        <span>Admin</span>
      </button>

      {/* SITE-admin-only impersonation controls */}
      {session.user.adminLevel === "SITE" && (
        <div className="flex items-center gap-2">
          {previewName ? (
            <button
              onClick={async () => {
                // Stop impersonation
                await fetch("/api/admin/impersonate", { method: "DELETE" });
                // Force reload to refresh session/context
                window.location.reload();
              }}
              className="rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              title="Stop impersonation"
            >
              Stop Preview: {previewName}
            </button>
          ) : (
            <button
              onClick={async () => {
                const identifier = window.prompt("Enter user email or id to impersonate:");
                if (!identifier) return;
                const res = await fetch("/api/admin/impersonate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ identifier }),
                });
                if (res.ok) {
                  window.location.reload();
                } else {
                  const data = await res.json().catch(() => ({}));
                  alert(`Failed to start preview: ${data?.error ?? res.statusText}`);
                }
              }}
              className="rounded-lg border border-amber-600 bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              title="Impersonate a user"
            >
              Start Preview
            </button>
          )}
        </div>
      )}
    </div>
  );
}

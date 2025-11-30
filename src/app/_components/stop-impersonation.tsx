"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function StopImpersonation() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cookies = document.cookie || "";
      setIsImpersonating(cookies.includes("__is_impersonating=1"));
      const match = /(?:^|; )__impersonated_user=([^;]+)/.exec(cookies);
      if (match?.[1]) {
        try {
          setImpersonatedName(decodeURIComponent(match[1]));
        } catch {
          setImpersonatedName(match[1]);
        }
      }
    } catch {
      setIsImpersonating(false);
    }
  }, []);

  if (!isImpersonating) return null;

  const stop = async () => {
    try {
      const resp = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!resp.ok) throw new Error("Failed to stop impersonation");
      // reload to restore admin session
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      toast.error("Failed to stop impersonation");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded shadow-lg bg-red-600 px-4 py-3 text-white">
      <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">You are impersonating {impersonatedName ?? 'another user'}</div>
          <button onClick={stop} className="ml-2 rounded bg-white/10 px-2 py-1 text-xs">
            Stop impersonating
          </button>
        </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ReportItem = {
  id: string;
  type: string;
  message?: string;
  wishlistId?: string;
  createdAt?: string;
};

type Group = {
  type: string;
  count: number;
  ids: string[];
  items: ReportItem[];
};

export default function WishlistReportsAlert() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!session?.user) return;
    let mounted = true;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const resp = await fetch("/api/wishlist-reports", { credentials: "same-origin" });
        if (!resp.ok) throw new Error("Failed to load reports");
        const data = await resp.json();
        if (mounted) setGroups(data ?? []);
      } catch (err) {
        console.error("Failed to fetch wishlist reports", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchReports();
    return () => void (mounted = false);
  }, [session?.user?.id]);

  const resolveGroup = async (ids: string[]) => {
    if (ids.length === 0) return;
    setResolving((s) => ({ ...s, [ids.join(",")]: true }));
    try {
      const resp = await fetch("/api/wishlist-reports", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: ids }),
      });

      if (!resp.ok) throw new Error("resolve failed");
      const json = await resp.json();
      // remove resolved ids from state
      setGroups((prev) =>
        (prev ?? []).map((g) => ({ ...g, ids: g.ids.filter((id) => !ids.includes(id)), count: g.count - ids.filter((id) => g.ids.includes(id)).length }))
          .filter((g) => g.count > 0)
      );

      return json;
    } catch (err) {
      console.error("Failed to resolve reports", err);
      return null;
    } finally {
      setResolving((s) => ({ ...s, [ids.join(",")]: false }));
    }
  };

  if (!session?.user) return null;
  if (loading) return null; // don't show while loading
  if (!groups || groups.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-yellow-200 border p-3 rounded-md shadow-sm mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-yellow-800">Wishlist reports need attention</div>
        <div className="text-xs text-yellow-600">You can mark reports resolved</div>
      </div>

      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.type} className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">{g.type}</div>
              <div className="text-xs text-muted-foreground">{g.count} report{g.count > 1 ? "s" : ""}</div>
            </div>

            <div className="flex gap-2 items-center">
              <button
                className="btn btn-sm"
                disabled={resolving[g.ids.join(",")]}
                onClick={() => void resolveGroup(g.ids)}
                title="Resolve all reports of this type"
              >
                {resolving[g.ids.join(",")] ? "Resolving..." : "Resolve all"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

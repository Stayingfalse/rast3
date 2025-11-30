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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    let mounted = true;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const resp = await fetch("/api/wishlist-reports", { credentials: "same-origin" });
        if (!resp.ok) throw new Error("Failed to load reports");
        const data = (await resp.json()) as Group[];
        if (mounted) {
          setGroups(data ?? []);
          // Auto-open modal if there are reports
          if (data && data.length > 0) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch wishlist reports", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchReports();
    return () => void (mounted = false);
  }, [session?.user]);

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
      const json = (await resp.json()) as { count: number };
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
  if (loading) return null;
  if (!groups || groups.length === 0) return null;

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <>
      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="p-8">
              {/* Header with Icon */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎁</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Hey {firstName}! 👋
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    Some of the elves on the site have tried to buy you a gift but have reported the following 
                    errors with your list. These may be incorrect reports, but could also indicate something is wrong. 
                    Please check your wishlist and once you think it&apos;s fixed, click{" "}
                    <span className="font-semibold">&quot;Resolve All&quot;</span> to remove that error type.
                  </p>
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-4">
                {groups.map((g) => (
                  <div
                    key={g.type}
                    className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 hover:border-yellow-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⚠️</span>
                          <h3 className="text-lg font-semibold text-gray-900">{g.type}</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          {g.count} {g.count === 1 ? "elf has" : "elves have"} reported this issue
                        </p>
                      </div>

                      <button
                        onClick={() => void resolveGroup(g.ids)}
                        disabled={resolving[g.ids.join(",")]}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow disabled:cursor-not-allowed"
                      >
                        {resolving[g.ids.join(",")] ? "Resolving..." : "Resolve All"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  Need help? Check your Amazon wishlist settings to ensure it&apos;s public and shipping address is set.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

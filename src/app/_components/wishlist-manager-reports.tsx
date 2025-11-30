"use client";

import { useEffect, useState } from "react";

type ReportItem = {
  id: string;
  type: string;
  message?: string;
  wishlistId?: string;
  createdAt?: string;
};

export default function WishlistManagerReports({ wishlistId }: { wishlistId: string }) {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!wishlistId) return;
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/wishlist-reports?wishlistId=${encodeURIComponent(wishlistId)}`, { credentials: 'same-origin' });
        if (!resp.ok) return;
        const groups = (await resp.json()) as Array<{ items?: ReportItem[] }>;
        // flatten all items
        const allItems: ReportItem[] = groups.flatMap((g) => g.items ?? []);
        if (mounted) setItems(allItems);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchData();
    return () => void (mounted = false);
  }, [wishlistId]);

  const resolve = async (id: string) => {
    setResolving((s) => ({ ...s, [id]: true }));
    try {
      const resp = await fetch('/api/wishlist-reports', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: [id] }),
      });
      if (!resp.ok) throw new Error('failed');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setResolving((s) => ({ ...s, [id]: false }));
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mt-4 border rounded-md p-3 bg-white">
      <div className="text-sm font-semibold mb-2">This wishlist has {items.length} report{items.length > 1 ? 's' : ''}</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">{it.type} • {new Date(it.createdAt ?? Date.now()).toLocaleString()}</div>
              <div className="text-sm">{it.message ?? 'No details'}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm" onClick={() => void resolve(it.id)} disabled={!!resolving[it.id]}>
                {resolving[it.id] ? 'Resolving…' : 'Resolve'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

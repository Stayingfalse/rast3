"use client";

import Image from "next/image";
import { useMemo } from "react";
import { api } from "~/trpc/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";
import HomeHeaderClientWrapper from "../_components/home-header-client-wrapper";

export default function SuccessPage() {
  // Fetch a few latest kudos (public)
  const { data: kudosResp, isLoading: kudosLoading } = api.kudos.getFeed.useQuery({ scope: "site", limit: 3 });

  // Try to fetch user stats (protected) - will gracefully be undefined if not authenticated
  const { data: userStats } = api.user.getStats.useQuery(undefined, { retry: false });

  // Try admin domain/department stats for purchases/links if running as site admin
  const { data: domainDeptStats } = api.admin.getDomainDepartmentStats.useQuery({}, { retry: false });

  const kudos = kudosResp?.items ?? [];

  // Aggregate headline stats from whichever source is available
  const stats = useMemo(() => {
    const people = userStats?.totalUsers ?? 0;
    let gifts = 0;
    let links = 0;
    if (domainDeptStats && Array.isArray(domainDeptStats)) {
      for (const d of domainDeptStats) {
        for (const dept of d.departments) {
          gifts += dept.purchases ?? 0;
          links += dept.links ?? 0;
        }
      }
    }
    // If no admin stats, fall back to visible counts
    return {
      peopleInvolved: people || undefined,
      giftsSent: gifts || undefined,
      wishlistsShared: links || undefined,
    };
  }, [userStats, domainDeptStats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black/90 to-black p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4">
          <HomeHeaderClientWrapper />
        </header>

        <section className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded border border-white/10 bg-black/70 p-3">
            <div className="text-sm text-white/80">People Involved</div>
            <div className="text-2xl font-bold">{stats.peopleInvolved ? stats.peopleInvolved.toLocaleString() : "—"}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/70 p-3">
            <div className="text-sm text-white/80">Gifts Sent</div>
            <div className="text-2xl font-bold">{stats.giftsSent ? stats.giftsSent.toLocaleString() : "—"}</div>
          </div>
          <div className="rounded border border-white/10 bg-black/70 p-3">
            <div className="text-sm text-white/80">Wishlists Shared</div>
            <div className="text-2xl font-bold">{stats.wishlistsShared ? stats.wishlistsShared.toLocaleString() : "—"}</div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-blue-300">Selected Stories</h2>
          <div className="grid grid-cols-3 gap-3">
            {kudosLoading ? (
              <div className="col-span-3 text-center text-white/70">Loading stories…</div>
            ) : kudos.length === 0 ? (
              <div className="col-span-3 text-center text-white/70">No stories available</div>
            ) : (
              kudos.map((k) => {
                // Safely parse images JSON into a string[] without unsafe any usage
                let imgs: string[] = [];
                if (k.images) {
                  try {
                    const parsed = JSON.parse(k.images);
                    if (Array.isArray(parsed)) {
                      imgs = parsed.map((v: unknown) => String(v));
                    }
                  } catch {
                    imgs = [];
                  }
                }
                const firstImg = imgs.length > 0 ? imgs[0] : k.user?.image ?? null;
                return (
                  <article key={k.id} className="rounded border border-white/10 bg-black/70 p-3">
                    <div className="mb-2 h-20 w-full overflow-hidden rounded bg-gray-800">
                      {firstImg ? (
                        <Image
                          src={getProxyImageUrl(firstImg)}
                          alt={k.message ? k.message.slice(0, 80) : "kudos image"}
                          width={800}
                          height={320}
                          className="h-full w-full object-cover"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-800" />
                      )}
                    </div>
                    <blockquote className="mb-2 text-sm leading-tight">“{k.message}”</blockquote>
                    <div className="text-xs text-white/60">— {k.user?.firstName ?? k.user?.name ?? k.user?.id}</div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="mb-6 rounded border border-white/10 bg-black/60 p-3 text-sm">
          <h3 className="mb-1 text-white/80 font-medium">About This Page</h3>
          <p className="text-white/70">This single-page summary pulls live kudos stories and, when available, headline statistics from the platform. If you are a site admin the gifts and wishlist counts will appear here automatically.</p>
        </section>

        <footer className="text-xs text-white/60">Generated by the RAoSanta platform • Compact one-page summary</footer>
      </div>
    </div>
  );
}

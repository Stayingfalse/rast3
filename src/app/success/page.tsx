"use client";

import Image from "next/image";
import { useMemo } from "react";
import { api } from "~/trpc/react";
import { getProxyImageUrl, handleImageError } from "~/utils/image-utils";
import HomeHeaderClientWrapper from "../_components/home-header-client-wrapper";

export default function SuccessPage() {
  // Fetch more kudos so we can interleave facts and show a richer feed
  const { data: kudosResp, isLoading: kudosLoading } = api.kudos.getFeed.useQuery({ scope: "site", limit: 9 });

  // Try to fetch user stats (protected) - will gracefully be undefined if not authenticated
  const { data: userStats } = api.user.getStats.useQuery(undefined, { retry: false });

  // Try admin domain/department stats for purchases/links if running as site admin
  const { data: domainDeptStats } = api.admin.getDomainDepartmentStats.useQuery({}, { retry: false });

  const kudos = kudosResp?.items ?? [];

  // Small site facts to intersperse — matches the homepage messaging
  const facts = [
    {
      id: "fact-1",
      emoji: "⚡",
      title: "Quick & Hassle-Free",
      desc: "Sign up in minutes, share your Amazon wishlist, and start spreading joy",
    },
    {
      id: "fact-2",
      emoji: "🎭",
      title: "Completely Anonymous",
      desc: "Gifters never see your address — Amazon handles delivery privately",
    },
    {
      id: "fact-3",
      emoji: "🤗",
      title: "Inclusive & No Pressure",
      desc: "Can't afford to give? No problem! Happy elves may still send you gifts",
    },
  ];

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
    <div className="min-h-screen p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 relative z-30">
          <div className="flex justify-center items-center">
            <div className="w-full max-w-3xl text-center">
              <HomeHeaderClientWrapper />
            </div>
          </div>
        </header>

        {/* Intro / Sales write-up */}
        <section className="mb-6 rounded-lg border border-white/10 bg-black/75 p-5 text-sm text-white/80 shadow-lg z-20 relative">
          <h2 className="text-xl font-semibold text-blue-300 mb-2">Why Random Acts of Santa Worked</h2>
          <p className="leading-snug">
            Random Acts of Santa created fast, low-friction moments of human connection across teams and organisations. Using a simple wishlist mechanism and an emphasis on anonymity and kindness, colleagues who might otherwise never exchange a gift came together to share meaningful presents and appreciation.
          </p>
          <p className="mt-3 leading-snug text-white/80">
            To date this campaign has involved <strong className="text-white">{stats.peopleInvolved ? stats.peopleInvolved.toLocaleString() : "many"}</strong> participants, with <strong className="text-white">{stats.giftsSent ? stats.giftsSent.toLocaleString() : "many"}</strong> gifts recorded and <strong className="text-white">{stats.wishlistsShared ? stats.wishlistsShared.toLocaleString() : "many"}</strong> wishlists shared across the organisation. These simple numbers represent dozens of small gestures that boosted morale, included colleagues who might otherwise be left out, and generated authentic stories shared below.
          </p>
        </section>

        <section className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center z-20 relative">
          <div className="rounded-lg border border-white/10 bg-gradient-to-b from-black/60 to-black/50 p-4 shadow-md">
            <div className="text-sm text-white/70">People Involved</div>
            <div className="text-2xl font-extrabold text-white mt-2">{stats.peopleInvolved ? stats.peopleInvolved.toLocaleString() : "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-gradient-to-b from-black/60 to-black/50 p-4 shadow-md">
            <div className="text-sm text-white/70">Gifts Sent</div>
            <div className="text-2xl font-extrabold text-white mt-2">{stats.giftsSent ? stats.giftsSent.toLocaleString() : "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-gradient-to-b from-black/60 to-black/50 p-4 shadow-md">
            <div className="text-sm text-white/70">Wishlists Shared</div>
            <div className="text-2xl font-extrabold text-white mt-2">{stats.wishlistsShared ? stats.wishlistsShared.toLocaleString() : "—"}</div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-blue-300">Selected Stories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kudosLoading ? (
              <div className="col-span-3 text-center text-white/70">Loading stories…</div>
            ) : kudos.length === 0 ? (
              <div className="col-span-3 text-center text-white/70">No stories available</div>
            ) : (
              (() => {
                const elements: React.ReactNode[] = [];
                let factIndex = 0;
                kudos.forEach((k, i) => {
                  // Safely parse images JSON into a string[] without unsafe any usage
                  let imgs: string[] = [];
                  if (k.images) {
                    try {
                      const parsed = JSON.parse(k.images) as unknown;
                      if (Array.isArray(parsed)) {
                        imgs = (parsed as unknown[]).map((v) => String(v));
                      }
                    } catch {
                      imgs = [];
                    }
                  }
                  const firstImg = imgs.length > 0 ? imgs[0] : k.user?.image ?? null;
                  elements.push(
                    <article key={k.id} className="rounded-lg border border-white/10 bg-black/65 p-3 shadow-sm">
                      <div className="mb-2 h-28 w-full overflow-hidden rounded-md bg-gray-800">
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
                      <blockquote className="mb-2 text-sm leading-tight text-white/85">“{k.message}”</blockquote>
                      <div className="text-xs text-white/60">— {k.user?.firstName ?? k.user?.name ?? k.user?.id}</div>
                    </article>,
                  );

                  // Insert a fact card after every 3 kudos
                  if ((i + 1) % 3 === 0 && facts.length > 0) {
                    const f = facts[factIndex % facts.length]!;
                    elements.push(
                      <article key={f.id} className="rounded-lg border border-white/10 bg-gradient-to-b from-blue-900/60 to-blue-900/40 p-4 text-left text-white/90 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{f.emoji}</div>
                          <div>
                            <div className="font-semibold">{f.title}</div>
                            <div className="text-xs text-white/70 mt-1">{f.desc}</div>
                          </div>
                        </div>
                      </article>,
                    );
                    factIndex += 1;
                  }
                });
                return elements;
              })()
            )}
          </div>
        </section>
        <footer className="text-xs text-white/60">Generated by the RAoSanta platform • Compact one-page summary</footer>
      </div>
    </div>
  );
}

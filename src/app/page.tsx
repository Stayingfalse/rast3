import { AuthShowcase } from "~/app/_components/auth-showcase";
import { KudosFeed } from "~/app/_components/kudos-feed";
import { GiftingSwitcher } from "~/app/_components/groups/gifting-switcher";
import { GiftsToYou } from "~/app/_components/gifts-to-you";
import { SeasonGate } from "~/app/_components/season-gate";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { getPublicTotals } from "~/server/public-stats";
import { currentSeason, publicSeason, ukDay } from "~/server/season";
import { api, HydrateClient } from "~/trpc/server";
import { HomePitch } from "./_components/home/home-pitch";
import { parsePersona } from "./_components/home/personas";
import HomeMarketingServer from "./_components/home-marketing-server";
import KudosAreaClient from "./_components/kudos-area-client";
import { GroupTotals } from "./_components/share/group-totals";
import { StampAlbum } from "./_components/stamp-album";
import { Wordmark } from "./_components/post/wordmark";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    const { for: forWhom } = await searchParams;
    const [totals, s] = await Promise.all([getPublicTotals(), publicSeason(db)]);
    const season = {
      year: currentSeason(),
      phase: s.phase,
      opens: ukDay(s.opensAt),
      closes: ukDay(s.closesAt),
    };
    return (
      <HydrateClient>
        <div className="flex w-full flex-col gap-24">
          <HomePitch
            initial={parsePersona(forWhom) ?? "workplace-join"}
            totals={totals}
            season={season}
          />
          <HomeMarketingServer season={season} />
          <KudosFeed />
        </div>
      </HydrateClient>
    );
  }

  // Start what the page needs on the server (29 Oct): it streams to the
  // browser with the page, instead of each part asking in turn after it loads
  void api.season.status.prefetch();
  void api.profile.getCurrentProfile.prefetch();
  void api.groups.mine.prefetch();
  void api.wishlist.getMyAssignments.prefetch();
  void api.wishlist.getAssignmentStats.prefetch();
  void api.wishlist.giftsToMe.prefetch();
  void api.stamps.getMyAlbum.prefetch();
  void api.share.myGroups.prefetch();
  void api.kudos.getRecommendedScope.prefetch();

  return (
    <HydrateClient>
      <div className="flex w-full flex-col items-center gap-12">
        <div className="flex w-full flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <Wordmark size="masthead" asHeading />
          <AuthShowcase />
        </div>
        <SeasonGate>
          <GiftingSwitcher>
            <WishlistManager />
          </GiftingSwitcher>
        </SeasonGate>
        <GiftsToYou />
        <StampAlbum />
        <GroupTotals />
        <div id="kudos-section" className="w-full">
          {/* Client-gated kudos form to avoid server/client mismatch */}
          <div className="mb-14">
            <KudosAreaClient />
          </div>
          <KudosFeed />
        </div>
      </div>
    </HydrateClient>
  );
}

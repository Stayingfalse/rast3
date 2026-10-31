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
  searchParams: Promise<{ for?: string; deleted?: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    const { for: forWhom, deleted } = await searchParams;
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
          {deleted === "1" && (
            <p role="status" className="label-stock text-ink p-4 text-center font-semibold">
              Your account and everything in it has been deleted. Thank you
              for every act of kindness.
            </p>
          )}
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

  // Fetch what the page shows on the server (29 Oct), so it arrives with the
  // page instead of each part asking in turn after it loads. Awaited, so the
  // server and the browser render the same thing (no hydration mismatch).
  await Promise.all([
    api.season.status.prefetch(),
    api.profile.getCurrentProfile.prefetch(),
    api.groups.mine.prefetch(),
    api.wishlist.getMyAssignments.prefetch(),
    api.wishlist.getAssignmentStats.prefetch(),
    api.wishlist.giftsToMe.prefetch(),
    api.stamps.getMyAlbum.prefetch(),
    api.share.myGroups.prefetch(),
    api.kudos.getRecommendedScope.prefetch(),
  ]);

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

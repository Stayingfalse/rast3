import { AuthShowcase } from "~/app/_components/auth-showcase";
import { KudosFeed } from "~/app/_components/kudos-feed";
import { GiftingSwitcher } from "~/app/_components/groups/gifting-switcher";
import { SeasonGate } from "~/app/_components/season-gate";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getPublicTotals } from "~/server/public-stats";
import { currentSeason, publicSeason, ukDay } from "~/server/season";
import { HydrateClient } from "~/trpc/server";
import { HomeHero } from "./_components/home-hero";
import HomeMarketingServer from "./_components/home-marketing-server";
import KudosAreaClient from "./_components/kudos-area-client";
import { GroupTotals } from "./_components/share/group-totals";
import { StampAlbum } from "./_components/stamp-album";
import { Wordmark } from "./_components/post/wordmark";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
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
          <HomeHero totals={totals} season={season} />
          <HomeMarketingServer season={season} />
          <KudosFeed />
        </div>
      </HydrateClient>
    );
  }

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

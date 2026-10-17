import { AuthShowcase } from "~/app/_components/auth-showcase";
import { KudosFeed } from "~/app/_components/kudos-feed";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { auth } from "~/server/auth";
import { getPublicTotals } from "~/server/public-stats";
import { HydrateClient } from "~/trpc/server";
import { HomeHero } from "./_components/home-hero";
import HomeMarketingServer from "./_components/home-marketing-server";
import KudosAreaClient from "./_components/kudos-area-client";
import { Wordmark } from "./_components/post/wordmark";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    const totals = await getPublicTotals();
    return (
      <HydrateClient>
        <div className="flex w-full flex-col gap-24">
          <HomeHero totals={totals} />
          <HomeMarketingServer />
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
        <WishlistManager />
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

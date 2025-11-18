import { AuthShowcase } from "~/app/_components/auth-showcase";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { HydrateClient } from "~/trpc/server";
import { KudosFeed } from "~/app/_components/kudos-feed";
import KudosAreaClient from "./_components/kudos-area-client";
import HomeHeaderClientWrapper from "./_components/home-header-client-wrapper";
import HomeMarketing from "./_components/home-marketing";

export default async function Home() {

  return (
    <HydrateClient>
      <div className="container mx-auto flex flex-col items-center justify-center gap-12 px-4 py-16">
        {" "}
        <HomeHeaderClientWrapper />
        <HomeMarketing />
        <div className="flex flex-col items-center gap-2">
          <AuthShowcase />
          <WishlistManager />
        </div>
        <div id="kudos-section" className="w-full max-w-4xl">
          {/* Client-gated kudos form to avoid server/client mismatch */}
          <div className="mb-4">
            <KudosAreaClient />
          </div>
          {/* Keep KudosFeed server-rendered */}
          <KudosFeed />
        </div>
      </div>
    </HydrateClient>
  );
}

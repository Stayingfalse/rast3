import Link from "next/link";

import { AuthShowcase } from "~/app/_components/auth-showcase";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {

  return (
    <HydrateClient>
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Random <span className="text-[hsl(280,100%,70%)]">Acts<br/> Of</span> Santa
          </h1>
          <div className="flex flex-col items-center gap-2">

            <AuthShowcase />
            <WishlistManager />
          </div>
    </HydrateClient>
  );
}

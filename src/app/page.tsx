import { AuthShowcase } from "~/app/_components/auth-showcase";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { HydrateClient } from "~/trpc/server";
import KudosForm from "~/app/_components/kudos-form";
import { KudosFeed } from "~/app/_components/kudos-feed";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function Home() {
  const session = await auth();
  
  // Check if user is logged in and has an enabled domain
  let showKudosForm = false;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { department: true },
    });
    
    if (user?.domain) {
      const domain = await db.domain.findUnique({
        where: { name: user.domain },
      });
      showKudosForm = domain?.enabled ?? false;
    }
  }

  return (
    <HydrateClient>
        <div className="container mx-auto flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Random <span className="text-[hsl(280,100%,70%)]">Acts<br/> Of</span> Santa
          </h1>
          
          <div className="flex flex-col items-center gap-2">
            <AuthShowcase />
            <WishlistManager />
          </div>

          {/* Show kudos form only for authenticated users with enabled domains */}
          {showKudosForm && (
            <div className="w-full max-w-4xl">
              <KudosForm />
            </div>
          )}

          {/* Always show the kudos feed */}
          <div className="w-full max-w-4xl">
            <KudosFeed />
          </div>
        </div>
    </HydrateClient>
  );
}

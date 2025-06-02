import { AuthShowcase } from "~/app/_components/auth-showcase";
import { WishlistManager } from "~/app/_components/wishlist-manager";
import { HydrateClient } from "~/trpc/server";
import KudosForm from "~/app/_components/kudos-form";
import { KudosFeed } from "~/app/_components/kudos-feed";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import HomeHeaderClientWrapper from "./_components/home-header-client-wrapper";

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
      <div className="container mx-auto flex flex-col items-center justify-center gap-12 px-4 py-16">        <HomeHeaderClientWrapper />
        
        {/* Marketing Content - Only show for unauthenticated users */}
        {!session && (
          <div className="w-full max-w-4xl">
            {/* Main Value Proposition */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                🎁 Bring Secret Santa to Remote Teams 🎁
              </h2>
              <p className="text-xl text-red-100 mb-6 leading-relaxed">
                Perfect for home workers and remote teams who want to share Christmas cheer 
                but don&apos;t know each other&apos;s addresses. Anonymous gifting made simple!
              </p>
            </div>

            {/* Key Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-white/20">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-semibold text-white mb-2">Quick & Hassle-Free</h3>
                <p className="text-red-100 text-sm">
                  Sign up in minutes, share your Amazon wishlist, and start spreading joy
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-white/20">
                <div className="text-3xl mb-3">🎭</div>
                <h3 className="text-lg font-semibold text-white mb-2">Completely Anonymous</h3>
                <p className="text-red-100 text-sm">
                  Gifters never see your address - Amazon handles delivery privately
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-white/20">
                <div className="text-3xl mb-3">🤗</div>
                <h3 className="text-lg font-semibold text-white mb-2">Inclusive & No Pressure</h3>
                <p className="text-red-100 text-sm">
                  Can&apos;t afford to give? No problem! Happy elves may still send you gifts
                </p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-green-600/20 backdrop-blur-sm rounded-xl p-8 border border-green-400/30 mb-8">
              <h3 className="text-2xl font-bold text-white text-center mb-6">
                🎅 How It Works
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 font-bold">1</div>
                  <p className="text-green-100 text-sm font-medium">Sign up &amp; join your company</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 font-bold">2</div>
                  <p className="text-green-100 text-sm font-medium">Share your Amazon wishlist</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 font-bold">3</div>
                  <p className="text-green-100 text-sm font-medium">Browse colleagues&apos; wishlists</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-3 font-bold">4</div>
                  <p className="text-green-100 text-sm font-medium">Send anonymous gifts & kudos!</p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-600/30 to-red-800/30 backdrop-blur-sm rounded-2xl p-8 border-2 border-red-400/40 shadow-2xl relative overflow-hidden">
                {/* Sparkle effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 text-yellow-300 text-sm animate-pulse">✨</div>
                  <div className="absolute top-6 right-8 text-yellow-300 text-xs animate-pulse" style={{animationDelay: '0.5s'}}>⭐</div>
                  <div className="absolute bottom-6 left-8 text-yellow-300 text-xs animate-pulse" style={{animationDelay: '1s'}}>💫</div>
                  <div className="absolute bottom-4 right-4 text-yellow-300 text-sm animate-pulse" style={{animationDelay: '1.5s'}}>✨</div>
                </div>
                
                <div className="relative z-10 mb-6">
                  <div className="text-4xl mb-3">🎅✨</div>
                  <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                    Ready to spread some Christmas magic?
                  </h3>
                  <p className="text-xl text-red-100 mb-4 leading-relaxed">
                    Join thousands of remote workers making the holidays special for their colleagues
                  </p>
                </div>
                
                <div className="relative z-10 text-lg text-red-200 mb-6 font-medium">
                  👇 Click below to sign up and join the fun 👇
                </div>
                
                {/* Trust indicators */}
                <div className="relative z-10 flex justify-center items-center gap-6 text-sm text-red-200">
                  <div className="flex items-center gap-1">
                    <span>🔒</span>
                    <span>100% Anonymous</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>⚡</span>
                    <span>Setup in 2 minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💝</span>
                    <span>No obligation to spend</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-white text-center mb-4">
                ❓ Quick Questions
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-medium text-white mb-2">🔐 Is my address private?</h4>
                  <p className="text-gray-200 text-sm">
                    Absolutely! Gifters only see your Amazon wishlist. Amazon handles all deliveries privately.
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-medium text-white mb-2">💰 Do I have to spend money?</h4>
                  <p className="text-gray-200 text-sm">
                    Not at all! You can participate by sharing your wishlist without any obligation to gift others.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

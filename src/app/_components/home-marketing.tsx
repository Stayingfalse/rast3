"use client";

import { useSession } from "next-auth/react";

export default function HomeMarketing() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session) return null;

  return (
    <div className="w-full max-w-4xl">
      {/* Main Value Proposition */}
      <div className="mb-8 text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          🎁 Bring Secret Santa to Remote Teams 🎁
        </h2>
        <p className="mb-6 text-xl leading-relaxed text-red-100">
          Perfect for home workers and remote teams who want to share
          Christmas cheer but don&apos;t know each other&apos;s addresses.
          Anonymous gifting made simple!
        </p>
      </div>

      {/* Key Benefits Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm">
          <div className="mb-3 text-3xl">⚡</div>
          <h3 className="mb-2 text-lg font-semibold text-white">Quick & Hassle-Free</h3>
          <p className="text-sm text-red-100">Sign up in minutes, share your Amazon wishlist, and start spreading joy</p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm">
          <div className="mb-3 text-3xl">🎭</div>
          <h3 className="mb-2 text-lg font-semibold text-white">Completely Anonymous</h3>
          <p className="text-sm text-red-100">Gifters never see your address - Amazon handles delivery privately</p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/10 p-6 text-center backdrop-blur-sm">
          <div className="mb-3 text-3xl">🤗</div>
          <h3 className="mb-2 text-lg font-semibold text-white">Inclusive & No Pressure</h3>
          <p className="text-sm text-red-100">Can&apos;t afford to give? No problem! Happy elves may still send you gifts</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-8 rounded-xl border border-green-400/30 bg-green-600/20 p-8 backdrop-blur-sm">
        <h3 className="mb-6 text-center text-2xl font-bold text-white">🎅 How It Works</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-white">1</div>
            <p className="text-sm font-medium text-green-100">Sign up &amp; join your company</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-white">2</div>
            <p className="text-sm font-medium text-green-100">Share your Amazon wishlist</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-white">3</div>
            <p className="text-sm font-medium text-green-100">Browse colleagues&apos; wishlists</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-white">4</div>
            <p className="text-sm font-medium text-green-100">Send anonymous gifts & kudos!</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-400/40 bg-gradient-to-br from-red-600/30 to-red-800/30 p-8 shadow-2xl backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-4 left-4 animate-pulse text-sm text-yellow-300">✨</div>
            <div className="absolute top-6 right-8 animate-pulse delay-500 text-xs text-yellow-300">⭐</div>
            <div className="absolute bottom-6 left-8 animate-pulse delay-1000 text-xs text-yellow-300">💫</div>
            <div className="absolute right-4 bottom-4 animate-pulse delay-1000 text-sm text-yellow-300">✨</div>
          </div>

          <div className="relative z-10 mb-6">
            <div className="mb-3 text-4xl">🎅✨</div>
            <h3 className="mb-4 text-3xl leading-tight font-bold text-white">Ready to spread some Christmas magic?</h3>
            <p className="mb-4 text-xl leading-relaxed text-red-100">Join other remote workers making the holidays special for their colleagues</p>
          </div>

          <div className="relative z-10 mb-6 text-lg font-medium text-red-200">👇 Click below to sign up and join the fun 👇</div>

          <div className="relative z-10 flex items-center justify-center gap-6 text-sm text-red-200">
            <div className="flex items-center gap-1"><span>🔒</span><span>100% Anonymous</span></div>
            <div className="flex items-center gap-1"><span>⚡</span><span>Setup in 2 minutes</span></div>
            <div className="flex items-center gap-1"><span>💝</span><span>No obligation to spend</span></div>
          </div>
        </div>
      </div>

      {/* Quick FAQ */}
      <div className="mt-8">
        <h3 className="mb-4 text-center text-lg font-bold text-white">❓ Quick Questions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="mb-2 font-medium text-white">🔐 Is my address private?</h4>
            <p className="text-sm text-gray-200">Absolutely! Gifters only see your Amazon wishlist. Amazon handles all deliveries privately.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="mb-2 font-medium text-white">💰 Do I have to spend money?</h4>
            <p className="text-sm text-gray-200">Not at all! You can participate by sharing your wishlist without any obligation to gift others.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

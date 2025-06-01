"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { SignInModal } from "./sign-in-modal";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Show nothing if authenticated (they have other ways to manage their account)
  if (status === "authenticated" && session?.user) return null;
  return (
    <>
      <button
        onClick={() => setIsSignInModalOpen(true)}
        className="fixed top-4 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold px-6 py-2 rounded-lg shadow-xl border border-red-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        title="Sign in to get started"
      >
        <span className="text-lg">🎅</span>
        <span>Join Santa</span>
      </button>
      
      <SignInModal 
        isOpen={isSignInModalOpen} 
        onClose={() => setIsSignInModalOpen(false)} 
      />
    </>
  );
}

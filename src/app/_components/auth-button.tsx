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
        type="button"
        className="btn-quiet bg-night/80 text-frost fixed top-4 right-4 z-40 sm:right-6"
      >
        Sign in
      </button>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </>
  );
}

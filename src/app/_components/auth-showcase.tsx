"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

import { api } from "~/trpc/react";
import { ProfileSetupModal } from "./profile-setup-modal";

export function AuthShowcase() {
  const { data: sessionData } = useSession();
  const [isProfileSetupModalOpen, setIsProfileSetupModalOpen] = useState(false);
  // Get current user profile - only runs for authenticated users
  const { data: userProfile, refetch: refetchProfile } =
    api.profile.getCurrentProfile.useQuery(undefined, {
      enabled: !!sessionData?.user,
    });

  // Day 12: only an unfinished profile (name + wishlist) opens the window;
  // joining groups happens on /groups.
  useEffect(() => {
    if (sessionData?.user && userProfile && !userProfile.profileCompleted) {
      setIsProfileSetupModalOpen(true);
    }
  }, [sessionData, userProfile]);
  // Early return if user is not authenticated - prevents rendering authenticated content
  if (!sessionData?.user) return null;

  const handleProfileSetupComplete = () => {
    setIsProfileSetupModalOpen(false);
    void refetchProfile(); // Refresh the profile data
  };

  const displayName =
    userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : sessionData.user?.name;

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <div className="sm:text-right">
        <p className="font-expanded text-frost text-lg font-bold">
          {displayName ? `Welcome, ${displayName}` : "Welcome"}
        </p>
        {userProfile && (
          <p className="text-frost-soft text-sm">
            {userProfile.profileCompleted ? (
              userProfile.workplace && (
                <>
                  {userProfile.workEmail ?? userProfile.workplace.name}
                  {userProfile.workplace.team &&
                    ` · ${userProfile.workplace.team.name}`}
                </>
              )
            ) : (
              <span className="text-gold-soft">Profile setup needed</span>
            )}
          </p>
        )}
      </div>

      {userProfile?.profileCompleted && userProfile.orgStatus === "PENDING" && (
        <p
          role="status"
          className="rounded-label border-gold/50 text-gold-soft max-w-md border px-3 py-2 text-sm"
        >
          Your organisation ({userProfile.workplace?.name}) is new and waiting for our
          approval. You can get your profile ready now; gifting opens once
          it&apos;s approved.
        </p>
      )}
      {userProfile?.profileCompleted && userProfile.orgStatus === "DISABLED" && (
        <p
          role="status"
          className="rounded-label border-gold/50 text-gold-soft max-w-md border px-3 py-2 text-sm"
        >
          Your organisation ({userProfile.workplace?.name}) is closed on Random Acts of
          Santa. You can join another group from Your groups.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/groups"
          className="btn-quiet text-frost min-h-10 py-2 text-sm"
        >
          Your groups
        </Link>
        {userProfile?.profileCompleted && (
          <button
            type="button"
            className="btn-quiet text-frost min-h-10 py-2 text-sm"
            onClick={() => setIsProfileSetupModalOpen(true)}
          >
            Edit profile
          </button>
        )}
        <button
          type="button"
          className="btn-quiet text-frost-soft min-h-10 border-transparent py-2 text-sm"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>

      <ProfileSetupModal
        isOpen={isProfileSetupModalOpen}
        onComplete={handleProfileSetupComplete}
        onClose={() => setIsProfileSetupModalOpen(false)}
        existingProfile={userProfile}
      />
    </div>
  );
}

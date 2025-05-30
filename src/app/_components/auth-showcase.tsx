"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

import { api } from "~/trpc/react";
import { SignInModal } from "./sign-in-modal";
import { ProfileSetupModal } from "./profile-setup-modal";

export function AuthShowcase() {
  const { data: sessionData } = useSession();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isProfileSetupModalOpen, setIsProfileSetupModalOpen] = useState(false);  // Get current user profile with proper typing
  const { data: userProfile, refetch: refetchProfile } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  ) as {
    data: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      workEmail?: string | null;
      domain?: string | null;
      departmentId?: string | null;
      department?: { id: string; name: string; domain: string } | null;
      amazonWishlistUrl?: string | null;
      profileCompleted: boolean;
      profileCompletedAt?: Date | null;
      domainEnabled?: boolean | null;
    } | null | undefined;
    refetch: () => void;
  };


  // Check if profile setup is needed when user signs in
  useEffect(() => {
    if (sessionData?.user && userProfile) {
      // If user has completed profile but domain is disabled, show profile modal with restriction
      if (userProfile.profileCompleted && userProfile.domain && userProfile.domainEnabled === false) {
        setIsProfileSetupModalOpen(true);
      }
      // If profile is not completed, show profile setup
      else if (!userProfile.profileCompleted) {
        setIsProfileSetupModalOpen(true);
      }
    }
  }, [sessionData, userProfile]);

  const handleProfileSetupComplete = () => {
    setIsProfileSetupModalOpen(false);
    void refetchProfile(); // Refresh the profile data
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && userProfile?.firstName && userProfile?.lastName ? (
          <span>Welcome, {userProfile.firstName} {userProfile.lastName}!</span>
        ) : sessionData ? (
          <span>Logged in as {sessionData.user?.name}</span>
        ) : null}
      </p>
        {/* Profile Status */}
      {sessionData && userProfile && (
        <div className="text-center">
          {userProfile.profileCompleted ? (
            <div className="space-y-1">
              <p className="text-sm text-green-400">
                ✓ Profile completed
                {userProfile.workEmail && ` • ${userProfile.workEmail}`}
                {userProfile.department && ` • ${userProfile.department.name}`}
              </p>
              {/* Domain status warning */}
              {userProfile.domain && userProfile.domainEnabled === false && (
                <p className="text-sm text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20">
                  ⚠ Your organization's domain ({userProfile.domain}) is currently disabled. Contact your manager for access.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-yellow-400">
              ⚠ Profile setup required
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
          onClick={sessionData ? () => void signOut() : () => setIsSignInModalOpen(true)}
        >
          {sessionData ? "Sign out" : "Sign in"}
        </button>
        
        {/* Profile Setup Button for completed profiles */}
        {sessionData && userProfile?.profileCompleted && (
          <button
            className="rounded-full bg-blue-600/20 px-6 py-3 font-semibold text-blue-300 no-underline transition hover:bg-blue-600/30"
            onClick={() => setIsProfileSetupModalOpen(true)}
          >
            Edit Profile
          </button>
        )}
      </div>
            
      <SignInModal 
        isOpen={isSignInModalOpen} 
        onClose={() => setIsSignInModalOpen(false)} 
      />      <ProfileSetupModal
        isOpen={isProfileSetupModalOpen}
        onComplete={handleProfileSetupComplete}
        onClose={() => setIsProfileSetupModalOpen(false)}
        existingProfile={userProfile}
      />
    </div>
  );
}

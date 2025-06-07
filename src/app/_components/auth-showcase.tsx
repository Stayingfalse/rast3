"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

import { api } from "~/trpc/react";
import { SignInModal } from "./sign-in-modal";
import { ProfileSetupModal } from "./profile-setup-modal";

export function AuthShowcase() {
  const { data: sessionData } = useSession();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isProfileSetupModalOpen, setIsProfileSetupModalOpen] = useState(false);
  // Get current user profile - only runs for authenticated users
  const { data: userProfile, refetch: refetchProfile } =
    api.profile.getCurrentProfile.useQuery(undefined, {
      enabled: !!sessionData?.user,
    }) as {
      data:
        | {
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
          }
        | null
        | undefined;
      refetch: () => void;
    };

  // Check domain status for completed profiles with domains
  const { data: domainStatus } = api.profile.checkDomainStatus.useQuery(
    { domain: userProfile?.domain ?? "" },
    {
      enabled: !!(
        sessionData?.user &&
        userProfile?.profileCompleted &&
        userProfile?.domain
      ),
    },
  );
  // Check if profile setup is needed when user signs in
  useEffect(() => {
    if (sessionData?.user && userProfile) {
      // If user has completed profile but domain is disabled, show profile modal with restriction
      if (
        userProfile.profileCompleted &&
        userProfile.domain &&
        userProfile.domainEnabled === false
      ) {
        setIsProfileSetupModalOpen(true);
      }
      // If user has completed profile but domain doesn't exist in system, show profile modal
      else if (
        userProfile.profileCompleted &&
        userProfile.domain &&
        domainStatus &&
        !domainStatus.exists
      ) {
        setIsProfileSetupModalOpen(true);
      }
      // If profile is not completed, show profile setup
      else if (!userProfile.profileCompleted) {
        setIsProfileSetupModalOpen(true);
      }
    }
  }, [sessionData, userProfile, domainStatus]);
  // Early return if user is not authenticated - prevents rendering authenticated content
  if (!sessionData?.user) {
    return (
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Main CTA Button */}
        <button
          className="transform rounded-2xl border-2 border-green-400 bg-gradient-to-r from-green-500 to-green-600 px-12 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-green-700"
          onClick={() => setIsSignInModalOpen(true)}
        >
          🎁 Start Your Secret Santa Journey 🎁
        </button>

        {/* Secondary smaller button */}
        <div className="text-center">
          <p className="mb-3 text-sm text-white/80">Already have an account?</p>
          <button
            className="rounded-full border border-white/30 bg-white/10 px-8 py-2 font-semibold text-white transition-all duration-200 hover:bg-white/20"
            onClick={() => setIsSignInModalOpen(true)}
          >
            Sign In
          </button>
        </div>

        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
        />
      </div>
    );
  }

  const handleProfileSetupComplete = () => {
    setIsProfileSetupModalOpen(false);
    void refetchProfile(); // Refresh the profile data
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {userProfile?.firstName && userProfile?.lastName ? (
          <span>
            Welcome, {userProfile.firstName} {userProfile.lastName}!
          </span>
        ) : (
          <span>Logged in as {sessionData.user?.name}</span>
        )}
      </p>

      {/* Profile Status */}
      {userProfile && (
        <div className="text-center">
          {userProfile.profileCompleted ? (
            <div className="space-y-1">
              <p className="text-sm text-green-400">
                ✓ Profile completed
                {userProfile.workEmail && ` • ${userProfile.workEmail}`}
                {userProfile.department && ` • ${userProfile.department.name}`}
              </p>{" "}
              {/* Domain status warnings */}
              {userProfile.domain && userProfile.domainEnabled === false && (
                <p className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm text-orange-400">
                  ⚠ Your organization&apos;s domain ({userProfile.domain}) is
                  currently disabled. Contact your manager for access.
                </p>
              )}
              {userProfile.domain &&
                userProfile.domainEnabled !== false &&
                domainStatus &&
                !domainStatus.exists && (
                  <p className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
                    ⚠ Your organization&apos;s domain ({userProfile.domain})
                    isn&apos;t set up in our system. You can set it up or
                    contact your employer.
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-yellow-400">⚠ Profile setup required</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
          onClick={() => void signOut()}
        >
          Sign out
        </button>

        {/* Profile Setup Button for completed profiles */}
        {userProfile?.profileCompleted && (
          <button
            className="rounded-full bg-blue-600/20 px-6 py-3 font-semibold text-blue-300 no-underline transition hover:bg-blue-600/30"
            onClick={() => setIsProfileSetupModalOpen(true)}
          >
            Edit Profile
          </button>
        )}
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

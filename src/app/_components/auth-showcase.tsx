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
              <>
                {userProfile.workEmail}
                {userProfile.department && ` · ${userProfile.department.name}`}
              </>
            ) : (
              <span className="text-gold-soft">Profile setup needed</span>
            )}
          </p>
        )}
      </div>

      {userProfile?.profileCompleted &&
        userProfile.domain &&
        userProfile.domainEnabled === false && (
          <p
            role="status"
            className="rounded-label border-gold/50 text-gold-soft max-w-md border px-3 py-2 text-sm"
          >
            Your organisation&apos;s domain ({userProfile.domain}) is currently
            disabled. Ask your organiser for access.
          </p>
        )}
      {userProfile?.profileCompleted &&
        userProfile.domain &&
        userProfile.domainEnabled !== false &&
        domainStatus &&
        !domainStatus.exists && (
          <p
            role="status"
            className="rounded-label border-gold/50 text-gold-soft max-w-md border px-3 py-2 text-sm"
          >
            Your organisation&apos;s domain ({userProfile.domain}) isn&apos;t
            set up yet. You can set it up or ask your employer.
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

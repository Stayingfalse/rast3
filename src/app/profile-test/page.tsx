"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "~/trpc/react";
import { ProfileSetupModal } from "../_components/profile-setup-modal";
import { SignInModal } from "../_components/sign-in-modal";

export default function ProfileTestPage() {
  const { data: sessionData } = useSession();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { data: userProfile, refetch } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  ) as { data: any; refetch: any }; // Type assertion to avoid TS issues with new profile fields

  const { data: exampleDepartments } = api.profile.getDepartmentsByDomain.useQuery(
    { domain: "example.com" },
    { enabled: true }
  );

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Profile Setup Test Page</h1>
      
      {!sessionData ? (
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="mb-4">Please sign in to test the profile setup functionality.</p>
          <button
            onClick={() => setIsSignInModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">✅ Authentication Successful</h2>
            <p className="mb-2"><strong>User ID:</strong> {sessionData.user.id}</p>
            <p className="mb-2"><strong>Name:</strong> {sessionData.user.name}</p>
            <p className="mb-4"><strong>Email:</strong> {sessionData.user.email}</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            {userProfile ? (
              <div className="space-y-2">
                <p><strong>Profile Completed:</strong> {userProfile.profileCompleted ? "✅ Yes" : "❌ No"}</p>
                <p><strong>First Name:</strong> {userProfile.firstName || "Not set"}</p>
                <p><strong>Last Name:</strong> {userProfile.lastName || "Not set"}</p>
                <p><strong>Work Email:</strong> {userProfile.workEmail || "Not set"}</p>
                <p><strong>Domain:</strong> {userProfile.domain || "Not set"}</p>
                <p><strong>Department:</strong> {userProfile.department?.name || "Not set"}</p>
                <p><strong>Amazon Wishlist:</strong> {userProfile.amazonWishlistUrl || "Not set"}</p>
                {userProfile.profileCompletedAt && (
                  <p><strong>Profile Completed At:</strong> {new Date(userProfile.profileCompletedAt).toLocaleString()}</p>
                )}
              </div>
            ) : (
              <p>Loading profile...</p>
            )}
            
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {userProfile?.profileCompleted ? "Edit Profile" : "Setup Profile"}
            </button>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Example Departments</h2>
            <p className="mb-2">Available departments for example.com domain:</p>            {exampleDepartments && exampleDepartments.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {exampleDepartments.map((dept: any) => (
                  <li key={dept.id}>
                    {dept.name} ({dept.domain})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No departments found for example.com</p>
            )}
          </div>
        </div>
      )}

      <SignInModal 
        isOpen={isSignInModalOpen} 
        onClose={() => setIsSignInModalOpen(false)} 
      />
        <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onComplete={() => {
          setIsProfileModalOpen(false);
          void refetch();
        }}
        onClose={() => setIsProfileModalOpen(false)}
        existingProfile={userProfile}
      />
    </div>
  );
}

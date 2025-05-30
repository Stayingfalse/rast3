"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { ProfileSetupModal } from "../_components/profile-setup-modal";

export default function ComprehensiveTestPage() {
  const { data: sessionData } = useSession();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Get user profile
  const { data: userProfile, refetch: refetchProfile } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  );

  // Get all departments
  const { data: allDepartments } = api.profile.getDepartmentsByDomain.useQuery(
    { domain: "all" },
    { enabled: !!sessionData?.user }
  );

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runTests = async () => {
    setTestResults([]);
    
    if (!sessionData?.user) {
      addTestResult("❌ User not authenticated");
      return;
    }

    addTestResult("✅ User authenticated");

    // Test profile retrieval
    try {
      if (userProfile) {
        addTestResult("✅ Profile retrieved successfully");
        addTestResult(`📋 Profile completed: ${userProfile.profileCompleted}`);
        addTestResult(`👤 Name: ${userProfile.firstName || 'N/A'} ${userProfile.lastName || 'N/A'}`);
        addTestResult(`📧 Work Email: ${userProfile.workEmail || 'N/A'}`);
        addTestResult(`🏢 Department: ${userProfile.department?.name || 'N/A'}`);
        addTestResult(`🛒 Amazon Wishlist: ${userProfile.amazonWishlistUrl ? 'Set' : 'Not set'}`);
      } else {
        addTestResult("❌ Failed to retrieve profile");
      }
    } catch (error) {
      addTestResult(`❌ Profile retrieval error: ${error}`);
    }

    // Test departments retrieval
    try {
      if (allDepartments) {
        addTestResult(`✅ Departments retrieved: ${allDepartments.length} found`);
        allDepartments.forEach(dept => {
          addTestResult(`🏢 ${dept.name} (${dept.domain})`);
        });
      } else {
        addTestResult("❌ Failed to retrieve departments");
      }
    } catch (error) {
      addTestResult(`❌ Departments retrieval error: ${error}`);
    }
  };

  const handleProfileUpdate = () => {
    setIsProfileModalOpen(false);
    void refetchProfile();
    addTestResult("✅ Profile updated successfully");
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Comprehensive Profile System Test
      </h1>

      {/* Authentication Section */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication</h2>
        {sessionData ? (
          <div className="space-y-2">
            <p className="text-green-600">✅ Signed in as: {sessionData.user?.name}</p>
            <p className="text-sm text-gray-600">User ID: {sessionData.user?.id}</p>
            <button
              onClick={() => void signOut()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-yellow-600">⚠ Not signed in</p>
            <div className="space-x-2">
              <button
                onClick={() => void signIn("discord")}
                className="bg-[#5865F2] text-white px-4 py-2 rounded hover:bg-[#4752C4]"
              >
                Sign in with Discord
              </button>
              <button
                onClick={() => void signIn("twitch")}
                className="bg-[#9146FF] text-white px-4 py-2 rounded hover:bg-[#772CE8]"
              >
                Sign in with Twitch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Section */}
      {sessionData && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
          {userProfile ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Profile Completed:</strong> 
                  <span className={userProfile.profileCompleted ? "text-green-600" : "text-red-600"}>
                    {userProfile.profileCompleted ? " ✅ Yes" : " ❌ No"}
                  </span>
                </div>
                <div>
                  <strong>First Name:</strong> {userProfile.firstName || "Not set"}
                </div>
                <div>
                  <strong>Last Name:</strong> {userProfile.lastName || "Not set"}
                </div>
                <div>
                  <strong>Work Email:</strong> {userProfile.workEmail || "Not set"}
                </div>
                <div>
                  <strong>Domain:</strong> {userProfile.domain || "Not set"}
                </div>
                <div>
                  <strong>Department:</strong> {userProfile.department?.name || "Not set"}
                </div>
                <div>
                  <strong>Amazon Wishlist:</strong> {userProfile.amazonWishlistUrl ? "Set" : "Not set"}
                </div>
                <div>
                  <strong>Completed At:</strong> {userProfile.profileCompletedAt ? new Date(userProfile.profileCompletedAt).toLocaleString() : "N/A"}
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {userProfile.profileCompleted ? "Edit Profile" : "Complete Profile"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading profile...</p>
          )}
        </div>
      )}

      {/* Departments Section */}
      {sessionData && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Departments</h2>
          {allDepartments && allDepartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDepartments.map((dept) => (
                <div key={dept.id} className="border rounded p-3">
                  <h3 className="font-medium">{dept.name}</h3>
                  <p className="text-sm text-gray-600">{dept.domain}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No departments found or loading...</p>
          )}
        </div>
      )}

      {/* Test Runner Section */}
      {sessionData && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Tests</h2>
          <button
            onClick={runTests}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
          >
            Run All Tests
          </button>
          
          {testResults.length > 0 && (
            <div className="bg-gray-50 rounded p-4 max-h-60 overflow-y-auto">
              <h3 className="font-medium mb-2">Test Results:</h3>
              <div className="space-y-1 text-sm font-mono">
                {testResults.map((result, index) => (
                  <div key={index} className="text-gray-800">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Navigation</h2>
        <div className="space-x-4">
          <a
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
          >
            ← Home
          </a>
          <a
            href="/admin"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 inline-block"
          >
            Admin Panel
          </a>
          <a
            href="/profile-test"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 inline-block"
          >
            Simple Profile Test
          </a>
        </div>
      </div>

      {/* Profile Setup Modal */}
      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onComplete={handleProfileUpdate}
        onClose={() => setIsProfileModalOpen(false)}
        existingProfile={userProfile}
      />
    </div>
  );
}

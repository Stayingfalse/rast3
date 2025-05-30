"use client";

import { useState, useEffect } from "react";
import { ProfileSetupModal } from "../_components/profile-setup-modal";

// Mock session data for testing
const MOCK_USER = {
  id: "debug-user-123",
  name: "Debug User",
  email: "debug@example.com",
  image: "https://avatar.vercel.sh/debug",
};

export default function NoAuthProfileTestPage() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mockProfile, setMockProfile] = useState<any>(null);
  const [debugResults, setDebugResults] = useState<string[]>([]);

  const addDebugResult = (result: string) => {
    setDebugResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // Simulate creating debug user
  const createDebugUser = async () => {
    try {
      addDebugResult("🔧 Creating debug user...");
      const response = await fetch("/api/debug-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      if (response.ok) {
        addDebugResult("✅ Debug user created successfully");
        addDebugResult(`👤 User: ${data.user.name} (${data.user.email})`);
      } else {
        addDebugResult(`❌ Failed to create debug user: ${data.error}`);
      }
    } catch (error) {
      addDebugResult(`❌ Error creating debug user: ${error}`);
    }
  };

  // Simulate profile operations
  const testProfileOperations = async () => {
    addDebugResult("🧪 Testing profile operations...");
    
    // This would normally use tRPC, but for testing we'll simulate
    setMockProfile({
      id: MOCK_USER.id,
      firstName: null,
      lastName: null,
      workEmail: null,
      domain: null,
      departmentId: null,
      department: null,
      amazonWishlistUrl: null,
      profileCompleted: false,
      profileCompletedAt: null,
    });
    
    addDebugResult("✅ Mock profile data loaded");
    addDebugResult("📋 Profile setup modal can now be tested");
  };

  const handleProfileComplete = (profileData: any) => {
    addDebugResult("✅ Profile setup completed!");
    addDebugResult(`📝 Data: ${JSON.stringify(profileData, null, 2)}`);
    setMockProfile({
      ...mockProfile,
      ...profileData,
      profileCompleted: true,
      profileCompletedAt: new Date(),
    });
    setIsProfileModalOpen(false);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>No-Auth Profile Test</strong> - This page allows testing the profile system without OAuth authentication issues in VS Code.
            </p>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">
        Profile System Test (No Auth Required)
      </h1>

      {/* Debug User Creation */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Create Debug User</h2>
        <p className="text-sm text-gray-600 mb-4">
          First, create a debug user in the database that can be used for testing.
        </p>
        <button
          onClick={createDebugUser}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Debug User
        </button>
      </div>

      {/* Profile Testing */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Test Profile System</h2>
        <p className="text-sm text-gray-600 mb-4">
          Load mock profile data and test the profile setup modal.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={testProfileOperations}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Load Mock Profile Data
          </button>

          {mockProfile && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium mb-2">Current Mock Profile:</h3>
              <div className="text-sm space-y-1">
                <div><strong>Profile Completed:</strong> {mockProfile.profileCompleted ? "✅ Yes" : "❌ No"}</div>
                <div><strong>First Name:</strong> {mockProfile.firstName || "Not set"}</div>
                <div><strong>Last Name:</strong> {mockProfile.lastName || "Not set"}</div>
                <div><strong>Work Email:</strong> {mockProfile.workEmail || "Not set"}</div>
                <div><strong>Department:</strong> {mockProfile.department?.name || "Not set"}</div>
                <div><strong>Amazon Wishlist:</strong> {mockProfile.amazonWishlistUrl || "Not set"}</div>
              </div>
              
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="mt-3 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                {mockProfile.profileCompleted ? "Edit Profile" : "Complete Profile Setup"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Debug Output */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Debug Output</h2>
        {debugResults.length > 0 ? (
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
            {debugResults.map((result, index) => (
              <div key={index}>{result}</div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No debug output yet. Run the tests above to see results.</p>
        )}
        
        <button
          onClick={() => setDebugResults([])}
          className="mt-3 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Clear Debug Output
        </button>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Navigation</h2>
        <div className="space-x-4">
          <a
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
          >
            ← Home (Normal Auth)
          </a>
          <a
            href="/comprehensive-test"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 inline-block"
          >
            Comprehensive Test
          </a>
          <a
            href="/admin"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 inline-block"
          >
            Admin Panel
          </a>
        </div>
      </div>

      {/* Profile Setup Modal - Note: This won't work with real tRPC without auth */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            
            <div className="text-center">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Profile Setup Test
              </h2>
              
              <div className="bg-yellow-50 p-4 rounded mb-6">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> This is a mock modal for testing the UI. 
                  The real ProfileSetupModal component requires authentication and tRPC.
                </p>
              </div>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="John"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Work Email *</label>
                  <input
                    type="email"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="john.doe@company.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amazon UK Wishlist URL</label>
                  <input
                    type="url"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX"
                  />
                </div>
              </div>
              
              <div className="mt-6 space-x-3">
                <button
                  onClick={() => handleProfileComplete({
                    firstName: "John",
                    lastName: "Doe", 
                    workEmail: "john.doe@example.com",
                    domain: "example.com",
                    amazonWishlistUrl: "https://www.amazon.co.uk/hz/wishlist/ls/ABC123DEF456"
                  })}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Mock Complete Setup
                </button>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

function DebugProfile() {
  const { data: sessionData } = useSession();
  const { data: userProfile, isLoading, error } = api.profile.getCurrentProfile.useQuery(
    undefined,
    { enabled: !!sessionData?.user }
  );

  if (!sessionData) {
    return <div>Not signed in</div>;
  }

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Profile Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Session Data:</h2>
        <pre className="text-sm bg-white p-2 rounded">
          {JSON.stringify(sessionData, null, 2)}
        </pre>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg mt-4">
        <h2 className="text-lg font-semibold mb-2">User Profile:</h2>
        <pre className="text-sm bg-white p-2 rounded">
          {JSON.stringify(userProfile, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default DebugProfile;

"use client";

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

function DebugProfile() {
  const { data: sessionData } = useSession();
  const {
    data: userProfile,
    isLoading,
    error,
  } = api.profile.getCurrentProfile.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });

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
      <h1 className="mb-4 text-2xl font-bold">Profile Debug</h1>

      <div className="rounded-lg bg-gray-100 p-4">
        <h2 className="mb-2 text-lg font-semibold">Session Data:</h2>
        <pre className="rounded bg-white p-2 text-sm">
          {JSON.stringify(sessionData, null, 2)}
        </pre>
      </div>

      <div className="mt-4 rounded-lg bg-gray-100 p-4">
        <h2 className="mb-2 text-lg font-semibold">User Profile:</h2>
        <pre className="rounded bg-white p-2 text-sm">
          {JSON.stringify(userProfile, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default DebugProfile;

import { Suspense } from "react";
import MagicLandingClient from "./client";

export default function MagicLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600" />
        </div>
      }
    >
      {/* Client component handles reading the query param */}
      <MagicLandingClient />
    </Suspense>
  );
}

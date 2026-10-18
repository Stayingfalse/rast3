import { Suspense } from "react";
import MagicLandingClient from "./client";

export default function MagicLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center py-16">
          <div className="border-post h-32 w-32 animate-spin rounded-full border-b-2" />
        </div>
      }
    >
      {/* Client component handles reading the query param */}
      <MagicLandingClient />
    </Suspense>
  );
}

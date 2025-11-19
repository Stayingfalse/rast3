"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import KudosForm from "~/app/_components/kudos-form";

export default function KudosAreaClient() {
  const { data: session, status } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    if (status === "loading") return;

    if (!session?.user?.id) {
      // No session, ensure we hide form
      setAllowed(false);
      return;
    }

    // Fetch server-side decision about domain.enabled. Ensure cookies are sent.
    void fetch("/api/kudos/allowed", { credentials: "same-origin" }).then(async (res) => {
      if (!mounted) return;
      try {
        if (!res.ok) {
          setAllowed(false);
          return;
        }
        const data: { allowed?: boolean } = (await res.json()) as { allowed?: boolean };
        setAllowed(Boolean(data.allowed));
      } catch {
        setAllowed(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [session, status]);

  // While we don't know, render nothing to avoid layout shifts
  if (allowed === null) return null;

  if (!allowed) return null;

  return <KudosForm />;
}

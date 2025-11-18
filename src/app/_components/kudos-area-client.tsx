"use client";

import React from "react";
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

    // Fetch server-side decision about domain.enabled
    void fetch("/api/kudos/allowed").then(async (res) => {
      if (!mounted) return;
      try {
        const json = await res.json();
        setAllowed(Boolean(json?.allowed));
      } catch (e) {
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

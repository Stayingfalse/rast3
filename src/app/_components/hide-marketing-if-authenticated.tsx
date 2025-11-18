"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function HideMarketingIfAuthenticated() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      const el = document.getElementById("home-marketing");
      if (el) {
        // remove the element from the DOM to avoid layout shifts
        el.remove();
      }
    }
  }, [session, status]);

  return null;
}

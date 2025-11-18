"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function HideMarketingIfAuthenticated() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      const el = document.getElementById("home-marketing");
      if (el) {
        // Hide the element via CSS instead of removing it from the DOM.
        // Removing can break React's hydration and cause "insertBefore" errors.
        el.style.setProperty("display", "none", "important");
        el.setAttribute("aria-hidden", "true");
        el.dataset.hiddenBy = "client-auth";
      }
    }
  }, [session, status]);

  return null;
}

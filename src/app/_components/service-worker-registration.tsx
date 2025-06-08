"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registration successful:", registration);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            console.log("[SW] Update found");
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[SW] New content available, please refresh");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[SW] Registration failed:", error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("[SW] Message from SW:", event.data);
      });

      // Listen for service worker state changes
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[SW] Controller changed - new service worker activated");
      });
    } else {
      console.warn("[SW] Service workers not supported");
    }
  }, []);

  return null; // This component doesn't render anything
}

"use client";

import { useEffect } from "react";
import { clientLogger } from "~/utils/client-logger";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registration successful:", registration);
          clientLogger.info("Service worker registered successfully", "ServiceWorker", {
            scope: registration.scope,
          });

          // Check for updates
          registration.addEventListener("updatefound", () => {
            console.log("[SW] Update found");
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[SW] New content available, please refresh");
                  clientLogger.info("Service worker update available", "ServiceWorker");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[SW] Registration failed:", error);
          clientLogger.error(
            error instanceof Error ? error : new Error("SW registration failed"),
            "Service worker registration failed",
            { error: error.message }
          );
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("[SW] Message from SW:", event.data);
      });

      // Listen for service worker state changes
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[SW] Controller changed - new service worker activated");
        clientLogger.info("Service worker controller changed", "ServiceWorker");
      });
    } else {
      console.warn("[SW] Service workers not supported");
      clientLogger.warn("Service workers not supported in this browser", "ServiceWorker");
    }
  }, []);

  return null; // This component doesn't render anything
}

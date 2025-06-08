"use client";

import { DevicePhoneMobileIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { clientLogger } from "~/utils/client-logger";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      setHasBeenDismissed(true);
      return;
    }

    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);    // Check if app is already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone) ||
      document.referrer.includes("android-app://");
    setIsStandalone(standalone);

    // Don't show prompt if already installed
    if (standalone) {
      clientLogger.interaction("app-already-installed", "AddToHomeScreen", { standalone: true });
      return;
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Show prompt after a delay to not be intrusive
      setTimeout(() => {
        setShowPrompt(true);
        clientLogger.interaction("pwa-install-prompt-shown", "AddToHomeScreen", { 
          platform: "android",
          userAgent: navigator.userAgent 
        });
      }, 3000);
    };

    // For iOS, show manual prompt after delay
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
        clientLogger.interaction("ios-install-prompt-shown", "AddToHomeScreen", { 
          platform: "ios",
          userAgent: navigator.userAgent 
        });
      }, 5000);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      clientLogger.error(new Error("No deferred prompt available"), "AddToHomeScreen install click");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      clientLogger.interaction("pwa-install-prompt-result", "AddToHomeScreen", { 
        outcome,
        platform: "android" 
      });

      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      clientLogger.error(
        error instanceof Error ? error : new Error("Install prompt failed"),
        "AddToHomeScreen install click",
        { platform: "android" }
      );
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setHasBeenDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", "true");
    
    clientLogger.interaction("pwa-install-prompt-dismissed", "AddToHomeScreen", { 
      platform: isIOS ? "ios" : "android" 
    });
  };

  // Don't show if dismissed, already installed, or conditions not met
  if (hasBeenDismissed || isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="relative rounded-lg bg-white p-4 shadow-lg border border-gray-200">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <DevicePhoneMobileIcon className="h-8 w-8 text-green-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Add RAoSanta to Home Screen
            </h3>
            
            {isIOS ? (
              <div className="mt-2 text-xs text-gray-600">
                <p>Tap the share button <span className="inline-block">⬆️</span> then &quot;Add to Home Screen&quot;</p>
              </div>
            ) : deferredPrompt ? (
              <div className="mt-2 text-xs text-gray-600">
                <p>Get quick access to RAoSanta by adding it to your home screen!</p>
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-600">
                <p>Install RAoSanta as an app! In Chrome, look for the install icon in the address bar.</p>
              </div>
            )}
            
            <div className="mt-3 flex space-x-2">
              {!isIOS && deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <PlusIcon className="mr-1 h-3.5 w-3.5" />
                  Add Now
                </button>
              )}
              
              <button
                onClick={handleDismiss}
                className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

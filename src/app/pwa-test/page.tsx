"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWATestPage() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {    const updateDebugInfo = () => {
      const info = {
        userAgent: navigator.userAgent,        isIOS: navigator.userAgent.includes("iPad") || navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPod"),
        isAndroid: navigator.userAgent.includes("Android"),
        isChrome: navigator.userAgent.includes("Chrome"),
        isFirefox: navigator.userAgent.includes("Firefox"),
        isSafari: navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome"),
        displayMode: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
        navigatorStandalone: Boolean((window.navigator as { standalone?: boolean }).standalone),
        referrer: document.referrer,
        protocol: window.location.protocol,
        isLocalhost: window.location.hostname === "localhost",
        supportsServiceWorker: "serviceWorker" in navigator,
        serviceWorkerReady: navigator.serviceWorker?.ready !== undefined,
        serviceWorkerController: !!navigator.serviceWorker?.controller,
        manifestExists: document.querySelector('link[rel="manifest"]') !== null,
        hasBeforeInstallPrompt: "onbeforeinstallprompt" in window,
        localStorage: {
          pwaDismissed: localStorage.getItem("pwa-prompt-dismissed"),
        }
      };
      setDebugInfo(info);
    };

    updateDebugInfo();

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("🚀 beforeinstallprompt event captured!", e);
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstallPrompt = async () => {
    if (!installPromptEvent) {
      alert("No install prompt available. This might mean the app doesn't meet PWA criteria or is already installed.");
      return;
    }

    try {
      await installPromptEvent.prompt();      const { outcome } = await installPromptEvent.userChoice;
      console.log("Install prompt result:", outcome);
      alert(`Install prompt result: ${outcome}`);
    } catch (error) {
      console.error("Install prompt error:", error);
      alert("Install prompt failed: " + (error as Error).message);
    }
  };

  const clearStorage = () => {
    localStorage.removeItem("pwa-prompt-dismissed");
    location.reload();
  };
  const testManifest = async () => {
    try {
      const response = await fetch("/site.webmanifest");
      const manifest: unknown = await response.json();
      console.log("Manifest loaded:", manifest);
      alert("Manifest loaded successfully! Check console for details.");
    } catch (error) {
      console.error("Manifest load error:", error);
      alert("Failed to load manifest: " + (error as Error).message);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">PWA Test Page</h1>
      
      <div className="mb-6 space-y-4">
        <button
          onClick={triggerInstallPrompt}
          disabled={!installPromptEvent}
          className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
        >
          Trigger Install Prompt {!installPromptEvent && "(Not Available)"}
        </button>
        
        <button
          onClick={clearStorage}
          className="rounded bg-red-500 px-4 py-2 text-white"
        >
          Clear PWA Storage & Reload
        </button>
        
        <button
          onClick={testManifest}
          className="rounded bg-green-500 px-4 py-2 text-white"
        >
          Test Manifest Load
        </button>
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-4 text-xl font-semibold">Debug Information</h2>
        <pre className="overflow-auto bg-gray-100 p-4 text-sm">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {installPromptEvent && (
        <div className="mt-4 rounded border-2 border-green-500 bg-green-50 p-4">
          <h3 className="font-semibold text-green-800">✅ Install Prompt Available!</h3>
          <p className="text-green-700">The beforeinstallprompt event has been captured.</p>
        </div>
      )}

      <div className="mt-6 space-y-2 text-sm text-gray-600">
        <h3 className="font-semibold">PWA Install Requirements (Chrome/Android):</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Must be served over HTTPS (or localhost)</li>
          <li>Must have a web app manifest with required fields</li>
          <li>Must have a service worker registered</li>
          <li>Must have at least one icon 192x192 or larger</li>
          <li>Must have start_url and display mode</li>
          <li>User must have interacted with the page</li>
          <li>App must not already be installed</li>
          <li>Must pass Chrome&apos;s &quot;installability criteria&quot;</li>
        </ul>
        
        <h3 className="font-semibold mt-4">iOS Instructions:</h3>
        <p>On iOS Safari, users must manually add to home screen via the share button.</p>
      </div>
    </div>
  );
}

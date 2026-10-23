/**
 * Counts a wishlist opening on Amazon (see src/app/api/track/open). A
 * beacon survives the page navigating away and never holds up the link.
 */
export function trackOpen(body: { assignmentId: string } | { giftPage: string }) {
  try {
    const data = new Blob([JSON.stringify(body)], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/track/open", data)) return;
    void fetch("/api/track/open", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      keepalive: true,
    });
  } catch {
    // counting is best-effort; the link still opens
  }
}

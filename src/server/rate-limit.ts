/**
 * Small fixed-window rate limiter kept in memory. The app runs as a single
 * container, so this is enough to stop a script hammering a mutation; move it
 * to the database or Redis if we ever run more than one instance.
 */
const windows = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

export function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    lastSweep = now;
  }
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  w.count += 1;
  return { ok: w.count <= limit, retryAfterMs: w.resetAt - now };
}

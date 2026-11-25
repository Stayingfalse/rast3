import type { Adapter } from "next-auth/adapters";

/**
 * MariaDB's "Record has changed since last read" (error 1020, 21 Nov): two
 * requests at the same moment both refresh the same session's expiry (or a
 * member's last-seen date), and the second write loses. Both wrote the same
 * thing, so losing is harmless; it shouldn't sign anyone out or count as an
 * error.
 */
export function isWriteConflict(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /\b1020\b|Record has changed since last read/.test(text);
}

/** The adapter, with a session refresh that retries once and then lets a lost race go. */
export function withSessionRetry(adapter: Adapter): Adapter {
  const update = adapter.updateSession?.bind(adapter);
  if (!update) return adapter;
  return {
    ...adapter,
    async updateSession(session) {
      try {
        return await update(session);
      } catch (error) {
        if (!isWriteConflict(error)) throw error;
        try {
          return await update(session);
        } catch (again) {
          if (isWriteConflict(again)) return null;
          throw again;
        }
      }
    },
  };
}

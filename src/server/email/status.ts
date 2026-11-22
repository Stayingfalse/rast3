/**
 * Is email getting out right now? (22 Nov) From 15 to 21 Nov sign-in links
 * failed for hours at a time and people only found out after trying. The
 * hourly email check and every sign-in email report here; the sign-in
 * window asks (`/api/email-status`) and, while email is down, suggests
 * another way in before anyone waits for a link that won't come.
 *
 * Kept in memory: one server, and a restart clears it (the check runs again
 * a few minutes after start). A failure older than STALE counts as unknown.
 */
const STALE = 2 * 3600_000;

/** nodemailer error codes that mean the server, not one address, failed */
const SERVER_CODES = new Set(["ECONNECTION", "EAUTH", "ETIMEDOUT", "ESOCKET", "EDNS", "ETLS", "EOAUTH2", "ECONNREFUSED"]);

type State = { ok: boolean; at: number; downSince: number | null };
const g = globalThis as { __emailState?: State };

export function noteEmail(ok: boolean) {
  const now = Date.now();
  const before = g.__emailState;
  const wasDown = before && !before.ok && now - before.at < STALE;
  g.__emailState = { ok, at: now, downSince: ok ? null : wasDown ? (before.downSince ?? now) : now };
}

/** Notes a failed send, unless it was about the one address (a rejected recipient). */
export function noteEmailError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && !SERVER_CODES.has(code)) return;
  noteEmail(false);
}

export function emailStatus(now = Date.now()): { down: boolean; since: string | null } {
  const s = g.__emailState;
  if (!s || s.ok || now - s.at > STALE) return { down: false, since: null };
  return { down: true, since: s.downSince ? new Date(s.downSince).toISOString() : null };
}

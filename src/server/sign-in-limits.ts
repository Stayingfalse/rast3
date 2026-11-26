import { hitRateLimit } from "~/server/rate-limit";
import { createChildLogger } from "~/utils/logger";

/**
 * Limits on sign-in emails (audit, 26 Nov). Anyone can ask for a sign-in
 * link to any address, and each one is a real email from our mailbox: with
 * no limit, a script could use up Gmail's daily allowance (and stop every
 * sign-in and reminder) or make us look like a spammer. Generous for people,
 * tight for scripts. In memory: the app runs as one server.
 */
const log = createChildLogger("sign-in-limits");
const MIN = 60_000;

/** per address, per network address, and for the whole site */
export const SIGN_IN_LIMITS = {
  address: { limit: 4, windowMs: 15 * MIN },
  addressDaily: { limit: 10, windowMs: 24 * 60 * MIN },
  // an office often shares one network address: 30 colleagues signing in
  // in the same quarter-hour still get through
  ip: { limit: 30, windowMs: 15 * MIN },
  // Gmail sends about 2,000 a day; reminders take at most 300 of them
  site: { limit: 200, windowMs: 60 * MIN },
  siteDaily: { limit: 600, windowMs: 24 * 60 * MIN },
} as const;

/** May we send a sign-in link to this address now? Counts the attempt. */
export function allowSignInEmail(email: string) {
  const key = email.trim().toLowerCase();
  const checks = [
    hitRateLimit(`signin:addr:${key}`, SIGN_IN_LIMITS.address.limit, SIGN_IN_LIMITS.address.windowMs),
    hitRateLimit(`signin:addr-day:${key}`, SIGN_IN_LIMITS.addressDaily.limit, SIGN_IN_LIMITS.addressDaily.windowMs),
    hitRateLimit("signin:site", SIGN_IN_LIMITS.site.limit, SIGN_IN_LIMITS.site.windowMs),
    hitRateLimit("signin:site-day", SIGN_IN_LIMITS.siteDaily.limit, SIGN_IN_LIMITS.siteDaily.windowMs),
  ];
  const ok = checks.every((c) => c.ok);
  if (!ok) log.warn({ domain: key.split("@")[1] }, "Sign-in email limit reached");
  return ok;
}

/** May this network address ask for another sign-in link? Counts the attempt. */
export function allowSignInRequest(ip: string | null) {
  if (!ip) return true;
  const r = hitRateLimit(`signin:ip:${ip}`, SIGN_IN_LIMITS.ip.limit, SIGN_IN_LIMITS.ip.windowMs);
  if (!r.ok) log.warn("Sign-in requests limit reached for one network address");
  return r.ok;
}

/** The visitor's address: Cloudflare's header first, then the proxy chain's first hop. */
export function clientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}

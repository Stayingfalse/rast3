import { createTransport } from "nodemailer";

import { emailSettings } from "~/server/email/smtp";
import { createChildLogger } from "~/utils/logger";

/**
 * Heartbeats (owner, 19 Nov): the hourly schedule tells Better Stack it ran,
 * so a silent failure (the reminders stopping, the email server refusing us,
 * as on 15-19 Nov) raises an alert within the hour instead of waiting for
 * someone to notice. Each heartbeat's URL is a setting, so only the server
 * that has it (prod) reports; without it nothing is sent.
 *
 * HEARTBEAT_REMINDERS_URL: after each hourly reminder run (or /fail).
 * HEARTBEAT_EMAIL_URL: the email server accepts our login (or /fail).
 */
const log = createChildLogger("heartbeats");

export type Heartbeat = "reminders" | "email";
const URLS: Record<Heartbeat, () => string | undefined> = {
  reminders: () => process.env.HEARTBEAT_REMINDERS_URL,
  email: () => process.env.HEARTBEAT_EMAIL_URL,
};

/** Tells Better Stack this part is working (or, with ok false, that it failed). Never throws. */
export async function beat(which: Heartbeat, ok = true) {
  const url = URLS[which]();
  if (!url) return false;
  try {
    const res = await fetch(ok ? url : `${url.replace(/\/$/, "")}/fail`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) log.warn({ which, status: res.status }, "Heartbeat not accepted");
    return res.ok;
  } catch (error) {
    log.warn({ which, error: error instanceof Error ? error.message : String(error) }, "Heartbeat failed to send");
    return false;
  }
}

/**
 * Does the email server accept our login? Connects and signs in, sends
 * nothing. Null when no email server is set up.
 */
export async function checkEmailServer(): Promise<{ ok: boolean; error?: string } | null> {
  const settings = await emailSettings();
  if (!settings) return null;
  const transport = createTransport({ ...settings.server, connectionTimeout: 20_000, greetingTimeout: 20_000 });
  try {
    await transport.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    transport.close();
  }
}

import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { getDbAuthProviders } from "~/server/utils/auth-providers";
import { clean, errorDetail } from "~/server/utils/error-detail";
import { maskEmail } from "~/server/work-email";
import { createChildLogger } from "~/utils/logger";
import { type EmailConfig, emailSettings } from "./smtp";
import { probeSmtp } from "./smtp-probe";

/**
 * Admin › Settings › "Send test email" (owner, 19 Nov): sends one email the
 * way sign-in links and reminders go, and says which step failed and what
 * the mail server answered. Also written to the logger (and so to the log
 * service, when BETTERSTACK_SOURCE_TOKEN is set).
 */
const log = createChildLogger("email-test");
export type EmailTestStep = "settings" | "connect" | "send";
export type EmailTestResult = {
  ok: boolean;
  /** where it stopped, when it failed */
  step: EmailTestStep | null;
  /** what we checked about the settings (no secrets) */
  settings: Record<string, unknown> | null;
  /** the mail server's reply or the error, cleaned */
  detail: unknown;
  to: string;
};

/** What the saved settings look like, without their secrets. */
async function describeSettings() {
  if (process.env.EMAIL_SERVER_HOST) {
    return {
      source: "environment (EMAIL_SERVER_*)",
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT ?? "587",
      from: process.env.EMAIL_FROM ?? null,
    };
  }
  const provider = (await getDbAuthProviders()).find((p) => p.name === "nodemailer" && p.isEmailProvider);
  if (!provider) return null;
  const c = (provider.emailConfig ?? {}) as Partial<EmailConfig>;
  return {
    source: "Admin › Settings",
    enabled: provider.enabled,
    authType: c.authType ?? null,
    host: c.host ?? null,
    port: c.port ?? null,
    from: c.from ?? null,
    user: c.user ?? null,
    ...(c.authType === "oauth2"
      ? {
          clientIdSaved: !!c.clientId,
          clientIdIsTheSitesGoogle: !!c.clientId && c.clientId === process.env.AUTH_GOOGLE_ID,
          clientKeySaved: !!c.clientSecret,
          gmailAuthorised: !!c.refreshToken,
          // Gmail only sends as the account it was authorised for (or its aliases)
          fromMatchesUser: !!c.from && !!c.user && c.from.toLowerCase().includes(c.user.toLowerCase()),
        }
      : { loginSaved: !!c.password }),
  };
}

/**
 * Which Google account the saved Gmail authorisation belongs to: Gmail only
 * lets that account (or its aliases) send, as the user name in the settings.
 * Exchanges the refresh token for an access token, then asks Gmail. Never
 * returns a token.
 */
async function googleAccountCheck(user: string | undefined) {
  if (process.env.EMAIL_SERVER_HOST) return null;
  const provider = (await getDbAuthProviders()).find((p) => p.name === "nodemailer" && p.isEmailProvider);
  const c = (provider?.emailConfig ?? {}) as Partial<EmailConfig>;
  if (c.authType !== "oauth2") return null;
  if (!c.clientId || !c.clientSecret || !c.refreshToken) return { step: "saved", ok: false, problem: "The Gmail authorisation isn't saved." };
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        refresh_token: c.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string; scope?: string };
    if (!res.ok || !body.access_token) {
      return { step: "refresh", ok: false, problem: `${body.error ?? res.status}: ${body.error_description ?? ""}`.trim() };
    }
    const profile = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${body.access_token}` },
    });
    const p = (await profile.json()) as { emailAddress?: string; error?: { message?: string } };
    if (!profile.ok || !p.emailAddress) {
      return { step: "profile", ok: false, problem: p.error?.message ?? `HTTP ${profile.status}`, grantedScopes: body.scope };
    }
    const same = !!user && p.emailAddress.toLowerCase() === user.toLowerCase();
    return {
      step: "profile",
      ok: same,
      authorisedAs: p.emailAddress,
      settingsUser: user ?? null,
      sameAccount: same,
      grantedScopes: body.scope,
      ...(same ? {} : { problem: "The Gmail authorisation is for a different account from the user name in the settings." }),
    };
  } catch (error) {
    return { step: "refresh", ok: false, problem: errorDetail(error) };
  }
}

/** A nodemailer logger that keeps the SMTP conversation, without logins. */
export function transcriptLogger(lines: string[]) {
  const keep = (level: string) => (_entry: unknown, message: string, ...args: unknown[]) => {
    let text = message;
    for (const a of args) text = text.replace(/%[sdj]/, typeof a === "string" ? a : JSON.stringify(a));
    for (const line of text.split("\n")) {
      const l = line.trim();
      if (!l) continue;
      // never a login: AUTH lines and anything that looks like an encoded token
      if (/\bAUTH\b|XOAUTH2|PLAIN|LOGIN/.test(l) && !/^S:\s*250-/.test(l)) {
        lines.push(`${level} [login line removed]`);
      } else if (/^S:\s*334 /.test(l)) {
        // Gmail's answer to a refused login: base64 JSON with a status and
        // scope, never a secret, and the most useful line here
        let decoded = "[removed]";
        try {
          const j = JSON.parse(Buffer.from(l.replace(/^S:\s*334 /, ""), "base64").toString("utf8")) as Record<string, unknown>;
          decoded = JSON.stringify({ status: j.status, schemes: j.schemes, scope: j.scope });
        } catch {}
        lines.push(`${level} S: 334 ${decoded}`);
      } else {
        lines.push(`${level} ${l.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[removed]")}`);
      }
    }
    if (lines.length > 80) lines.splice(0, lines.length - 80);
  };
  return { trace: keep("trace"), debug: keep("debug"), info: keep("info"), warn: keep("warn"), error: keep("error"), fatal: keep("fatal") };
}

/**
 * "Check the connection only": probes the saved mail server (or Gmail's,
 * when none is saved) without signing in or sending anything.
 */
export async function checkEmailConnection() {
  const settings = await emailSettings();
  const host = settings?.server.host ?? "smtp.gmail.com";
  const port = Number(settings?.server.port ?? 587);
  const probe = await probeSmtp(host, port);
  const ok = probe.attempts.some((a) => a.port === port && a.outcome === "greeting");
  const result = { ok, saved: !!settings, probe };
  if (ok) log.info(result, "Email connection check: the server answers");
  else log.error(result, "Email connection check: no greeting from the server");
  return result;
}

export async function sendTestEmail(to: string): Promise<EmailTestResult> {
  const described = await describeSettings();
  const google = await googleAccountCheck((described as { user?: string } | null)?.user);
  // the SMTP conversation, filled while it runs (declared first: finish() reads it)
  const lines: string[] = [];
  const finish = async (r: Omit<EmailTestResult, "settings" | "to">) => {
    const result: EmailTestResult = {
      ...r,
      settings: described && (clean({ ...described, ...(google ? { googleAccount: google } : {}) }) as Record<string, unknown>),
      detail: clean({ reply: r.detail, conversation: lines }),
      to: maskEmail(to),
    };
    if (r.ok) log.info(result, "Test email sent");
    else log.error(result, `Test email failed at "${r.step}"`);
    return result;
  };

  const settings = await emailSettings();
  if (!settings) {
    return finish({
      ok: false,
      step: "settings",
      detail: { message: "No email server is set up, or email sign-in is switched off in Admin › Settings." },
    });
  }
  // logger + debug: the SMTP conversation, for the result (logins removed)
  const transport = createTransport({
    ...settings.server,
    logger: transcriptLogger(lines),
    debug: true,
  } as SMTPTransport.Options);
  try {
    await transport.verify();
  } catch (error) {
    // where the connection stops: DNS, each address, both Gmail ports (20 Nov)
    const { host, port } = settings.server;
    const probe = host ? await probeSmtp(host, Number(port ?? 587)) : null;
    return finish({ ok: false, step: "connect", detail: { error: errorDetail(error), probe } });
  }
  try {
    const info = await transport.sendMail({
      to,
      from: settings.from,
      subject: "Random Acts of Santa: test email",
      text: "This is a test from Admin › Settings. If it arrived, sign-in links and reminder emails can go out.",
    });
    return finish({
      ok: true,
      step: null,
      detail: { messageId: info.messageId, response: info.response, accepted: info.accepted, rejected: info.rejected },
    });
  } catch (error) {
    return finish({ ok: false, step: "send", detail: errorDetail(error) });
  }
}

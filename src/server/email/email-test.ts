import { createTransport } from "nodemailer";

import { appLog, clean, errorDetail } from "~/server/app-log";
import { getDbAuthProviders } from "~/server/utils/auth-providers";
import { maskEmail } from "~/server/work-email";
import { type EmailConfig, emailSettings } from "./smtp";

/**
 * Admin › Settings › "Send test email" (owner, 19 Nov): sends one email the
 * way sign-in links and reminders go, and says which step failed and what
 * the mail server answered. Recorded in Admin › Logs.
 */
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

export async function sendTestEmail(to: string): Promise<EmailTestResult> {
  const described = await describeSettings();
  const finish = async (r: Omit<EmailTestResult, "settings" | "to">) => {
    const result: EmailTestResult = { ...r, settings: described, detail: clean(r.detail), to: maskEmail(to) };
    await appLog(r.ok ? "INFO" : "ERROR", "email-test", r.ok ? "Test email sent" : `Test email failed at "${r.step}"`, result);
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
  const transport = createTransport(settings.server);
  try {
    await transport.verify();
  } catch (error) {
    return finish({ ok: false, step: "connect", detail: errorDetail(error) });
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

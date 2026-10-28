import { getDbAuthProviders } from "~/server/utils/auth-providers";

/**
 * Where the site's email goes out from (27 Oct). Sign-in links and reminder
 * emails share it: the EMAIL_SERVER_* environment variables when they're set,
 * otherwise the email sign-in set up in Admin › Settings (stored with the
 * "nodemailer" provider: basic SMTP or Gmail OAuth2).
 */
export interface EmailConfig {
  host?: string;
  port?: number;
  from?: string;
  authType: "basic" | "oauth2";
  // Basic auth fields
  user?: string;
  password?: string;
  // OAuth2 fields
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
}

/** nodemailer server options for an Admin › Settings email config. */
export function serverFromEmailConfig(c: EmailConfig) {
  return {
    host: c.host,
    port: c.port,
    auth:
      c.authType === "oauth2"
        ? {
            // Gmail OAuth2: nodemailer refreshes the access token itself
            type: "OAuth2" as const,
            user: c.user,
            clientId: c.clientId,
            clientSecret: c.clientSecret,
            refreshToken: c.refreshToken,
            accessToken: c.accessToken,
          }
        : { user: c.user, pass: c.password },
  };
}

export type EmailSettings = {
  server: ReturnType<typeof serverFromEmailConfig>;
  from: string | undefined;
  source: "environment" | "admin";
};

/** The email server to send with, or null when none is set up. */
export async function emailSettings(): Promise<EmailSettings | null> {
  if (process.env.EMAIL_SERVER_HOST) {
    return {
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587"),
        auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
      },
      from: process.env.EMAIL_FROM,
      source: "environment",
    };
  }
  const provider = (await getDbAuthProviders()).find(
    (p) => p.name === "nodemailer" && p.isEmailProvider && p.enabled,
  );
  if (!provider?.emailConfig) return null;
  const config = provider.emailConfig as unknown as EmailConfig;
  return { server: serverFromEmailConfig(config), from: config.from, source: "admin" };
}

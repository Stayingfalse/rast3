import { db } from "~/server/db";
import { loggers } from "~/utils/logger";

export interface AuthProviderConfig {
  id: string;
  name: string;
  displayName: string;
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;
  isEmailProvider: boolean;
  emailConfig?: Record<string, unknown>;
}

/**
 * Get authentication providers from database
 * Used as fallback when environment variables are not set
 */
export async function getDbAuthProviders(): Promise<AuthProviderConfig[]> {
  try {
    const providers = await db.authProvider.findMany({
      where: { enabled: true },
      orderBy: { displayName: "asc" },
    });
    // Convert null values to undefined to match interface
    return providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      clientId: provider.clientId ?? undefined,
      clientSecret: provider.clientSecret ?? undefined,
      enabled: provider.enabled,
      isEmailProvider: provider.isEmailProvider,
      emailConfig: provider.emailConfig as Record<string, unknown> | undefined,    }));
  } catch (error) {
    loggers.auth.error("Failed to fetch auth providers from database", {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Get a specific provider configuration from database
 */
export async function getDbAuthProvider(
  name: string,
): Promise<AuthProviderConfig | null> {
  try {
    const provider = await db.authProvider.findFirst({
      where: {
        name,
        enabled: true,
      },
    });

    if (!provider) return null;

    return {
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      clientId: provider.clientId ?? undefined,
      clientSecret: provider.clientSecret ?? undefined,
      enabled: provider.enabled,
      isEmailProvider: provider.isEmailProvider,
      emailConfig: provider.emailConfig as Record<string, unknown> | undefined,    };
  } catch (error) {
    loggers.auth.error("Failed to fetch auth provider from database", {
      providerName: name,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Check if provider is configured in environment variables
 */
export function isProviderInEnv(providerName: string): boolean {
  switch (providerName) {
    case "github":
      return !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
    case "google":
      return !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
    case "discord":
      return !!(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
    case "twitch":
      return !!(process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET);
    case "reddit":
      return !!(process.env.AUTH_REDDIT_ID && process.env.AUTH_REDDIT_SECRET);
    case "instagram":
      return !!(
        process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET
      );
    case "facebook":
      return !!(
        process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      );
    case "tiktok":
      return !!(process.env.AUTH_TIKTOK_ID && process.env.AUTH_TIKTOK_SECRET);
    case "nodemailer":
      return !!process.env.EMAIL_SERVER_HOST;
    default:
      return false;
  }
}

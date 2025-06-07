// Dynamic authentication provider configuration
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Discord from "next-auth/providers/discord";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Instagram from "next-auth/providers/instagram";
import Nodemailer from "next-auth/providers/nodemailer";
import Reddit from "next-auth/providers/reddit";
import TikTok from "next-auth/providers/tiktok";
import Twitch from "next-auth/providers/twitch";
import { db } from "~/server/db";
import { getDbAuthProviders } from "~/server/utils/auth-providers";

// Email configuration interface
interface EmailConfig {
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

// Cache for database providers to avoid repeated DB calls
let dbProvidersCache: Awaited<ReturnType<typeof getDbAuthProviders>> | null =
  null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedDbProviders() {
  const now = Date.now();
  if (!dbProvidersCache || now > cacheExpiry) {
    try {
      dbProvidersCache = await getDbAuthProviders();
      cacheExpiry = now + CACHE_DURATION;
    } catch (error) {
      console.error("Failed to fetch database providers:", error);
      // Return empty array if DB is unavailable
      return [];
    }
  }
  return dbProvidersCache;
}

export async function createDynamicAuthConfig(): Promise<NextAuthConfig> {
  const providers: Provider[] = [];

  // Get database providers for fallback
  const dbProviders = await getCachedDbProviders();

  // Helper function to get provider config
  const getProviderConfig = (
    providerName: string,
    envIdKey: string,
    envSecretKey: string,
  ) => {
    const envId = process.env[envIdKey];
    const envSecret = process.env[envSecretKey];

    if (envId && envSecret) {
      return {
        clientId: envId,
        clientSecret: envSecret,
        source: "env" as const,
      };
    }

    const dbProvider = dbProviders.find(
      (p) => p.name === providerName && p.enabled,
    );
    if (dbProvider?.clientId && dbProvider?.clientSecret) {
      return {
        clientId: dbProvider.clientId,
        clientSecret: dbProvider.clientSecret,
        source: "db" as const,
      };
    }

    return null;
  };

  // GitHub Provider
  const githubConfig = getProviderConfig(
    "github",
    "AUTH_GITHUB_ID",
    "AUTH_GITHUB_SECRET",
  );
  if (githubConfig) {
    providers.push(
      GitHub({
        clientId: githubConfig.clientId,
        clientSecret: githubConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Discord Provider
  const discordConfig = getProviderConfig(
    "discord",
    "AUTH_DISCORD_ID",
    "AUTH_DISCORD_SECRET",
  );
  if (discordConfig) {
    providers.push(
      Discord({
        clientId: discordConfig.clientId,
        clientSecret: discordConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  } // Google Provider
  const googleConfig = getProviderConfig(
    "google",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
  );
  if (googleConfig) {
    providers.push(
      Google({
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
        // Default scope for normal user authentication - no Gmail access
        authorization: {
          params: {
            scope: "openid email profile",
            access_type: "offline",
            prompt: "select_account",
          },
        },
      }),
    );
  }

  // Twitch Provider
  const twitchConfig = getProviderConfig(
    "twitch",
    "AUTH_TWITCH_ID",
    "AUTH_TWITCH_SECRET",
  );
  if (twitchConfig) {
    providers.push(
      Twitch({
        clientId: twitchConfig.clientId,
        clientSecret: twitchConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Reddit Provider
  const redditConfig = getProviderConfig(
    "reddit",
    "AUTH_REDDIT_ID",
    "AUTH_REDDIT_SECRET",
  );
  if (redditConfig) {
    providers.push(
      Reddit({
        clientId: redditConfig.clientId,
        clientSecret: redditConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Instagram Provider
  const instagramConfig = getProviderConfig(
    "instagram",
    "AUTH_INSTAGRAM_ID",
    "AUTH_INSTAGRAM_SECRET",
  );
  if (instagramConfig) {
    providers.push(
      Instagram({
        clientId: instagramConfig.clientId,
        clientSecret: instagramConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Facebook Provider
  const facebookConfig = getProviderConfig(
    "facebook",
    "AUTH_FACEBOOK_ID",
    "AUTH_FACEBOOK_SECRET",
  );
  if (facebookConfig) {
    providers.push(
      Facebook({
        clientId: facebookConfig.clientId,
        clientSecret: facebookConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // TikTok Provider
  const tiktokConfig = getProviderConfig(
    "tiktok",
    "AUTH_TIKTOK_ID",
    "AUTH_TIKTOK_SECRET",
  );
  if (tiktokConfig) {
    providers.push(
      TikTok({
        clientId: tiktokConfig.clientId,
        clientSecret: tiktokConfig.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  // Nodemailer provider for magic links
  if (process.env.EMAIL_SERVER_HOST) {
    providers.push(
      Nodemailer({
        server: {
          host: process.env.EMAIL_SERVER_HOST,
          port: parseInt(process.env.EMAIL_SERVER_PORT ?? "587"),
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        },
        from: process.env.EMAIL_FROM,
      }),
    );
  } else {
    const dbProvider = dbProviders.find(
      (p) => p.name === "nodemailer" && p.isEmailProvider && p.enabled,
    );
    if (dbProvider?.emailConfig) {
      const emailConfig = dbProvider.emailConfig as unknown as EmailConfig;
      let authConfig;
      if (emailConfig.authType === "oauth2") {
        // OAuth2 configuration (for Google Apps, etc.)
        authConfig = {
          type: "OAuth2" as const,
          user: emailConfig.user,
          clientId: emailConfig.clientId,
          clientSecret: emailConfig.clientSecret,
          refreshToken: emailConfig.refreshToken,
          accessToken: emailConfig.accessToken,
        };
      } else {
        // Basic username/password authentication
        authConfig = {
          user: emailConfig.user,
          pass: emailConfig.password,
        };
      }

      providers.push(
        Nodemailer({
          server: {
            host: emailConfig.host,
            port: emailConfig.port,
            auth: authConfig,
          },
          from: emailConfig.from,
        }),
      );
    }
  }

  return {
    adapter: PrismaAdapter(db),
    providers,
    cookies: {
      sessionToken: {
        name: "next-auth.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        },
      },
      callbackUrl: {
        name: "next-auth.callback-url",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          maxAge: 10 * 60, // 10 minutes
        },
      },
      csrfToken: {
        name: "next-auth.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60, // 1 hour
        },
      },
    },
    callbacks: {
      session: async ({ session, user }) => {
        const { id } = user;
        // We can safely access these fields since we've augmented the User type
        const { adminLevel, adminScope } = user;

        return {
          ...session,
          user: {
            ...session.user,
            id,
            adminLevel,
            adminScope,
          },
        };
      },
    },
    debug: process.env.NODE_ENV === "development",
  };
}

// Cache the auth instance to avoid recreating it on every request
let authInstance: ReturnType<typeof NextAuth> | null = null;
let authInstanceExpiry = 0;

export async function getDynamicAuth() {
  const now = Date.now();
  if (!authInstance || now > authInstanceExpiry) {
    const config = await createDynamicAuthConfig();
    authInstance = NextAuth(config);
    authInstanceExpiry = now + CACHE_DURATION;
  }
  return authInstance;
}

// Export functions that will be used in the API routes
export async function getHandlers() {
  const auth = await getDynamicAuth();
  return auth.handlers;
}

export async function getAuth() {
  const auth = await getDynamicAuth();
  return auth.auth;
}

export async function getSignIn() {
  const auth = await getDynamicAuth();
  return auth.signIn;
}

export async function getSignOut() {
  const auth = await getDynamicAuth();
  return auth.signOut;
}

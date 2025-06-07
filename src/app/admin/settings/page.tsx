"use client";

import type { JsonValue } from "@prisma/client/runtime/library";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { SiteAdminLayout } from "~/app/_components/site-admin-layout";
import { api } from "~/trpc/react";

// Email configuration interface to match the server-side interface
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

interface AuthProviderFormData {
  id?: string;
  name: string;
  displayName: string;
  clientId: string | null;
  clientSecret: string | null;
  enabled: boolean;
  isEmailProvider: boolean;
  emailConfig?: JsonValue | null;
}

interface AuthProviderData extends AuthProviderFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  creator: {
    name: string | null;
    email: string | null;
  };
}

const DEFAULT_PROVIDERS = [
  { name: "google", displayName: "Google", isEmailProvider: false },
  { name: "github", displayName: "GitHub", isEmailProvider: false },
  { name: "discord", displayName: "Discord", isEmailProvider: false },
  { name: "twitch", displayName: "Twitch", isEmailProvider: false },
  { name: "reddit", displayName: "Reddit", isEmailProvider: false },
  { name: "instagram", displayName: "Instagram", isEmailProvider: false },
  { name: "facebook", displayName: "Facebook", isEmailProvider: false },
  { name: "tiktok", displayName: "TikTok", isEmailProvider: false },
  {
    name: "nodemailer",
    displayName: "Email (Magic Links)",
    isEmailProvider: true,
  },
];

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] =
    useState<AuthProviderFormData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [emailAuthType, setEmailAuthType] = useState<"basic" | "oauth2">(
    "basic",
  );
  const [oauthTokens, setOauthTokens] = useState<{
    accessToken?: string;
    refreshToken?: string;
  }>({});
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false); // Queries
  const { data: providers = [], refetch: refetchProviders } =
    api.authProvider.getAll.useQuery();
  const { data: envStatus = {} } = api.authProvider.getEnvStatus.useQuery();
  // Mutations
  const createProvider = api.authProvider.create.useMutation({
    onSuccess: () => {
      toast.success("Provider created successfully");
      void refetchProviders();
      setSelectedProvider(null);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateProvider = api.authProvider.update.useMutation({
    onSuccess: () => {
      toast.success("Provider updated successfully");
      void refetchProviders();
      setSelectedProvider(null);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteProvider = api.authProvider.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider deleted successfully");
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  }); // Generate Gmail OAuth2 URL for admin email setup
  const generateGmailOAuth2Url =
    api.authProvider.generateGmailOAuth2Url.useMutation({
      onSuccess: (data) => {
        // Redirect to Google OAuth2 consent page
        window.location.href = data.authUrl;
      },
      onError: (error) => {
        setIsOAuthInProgress(false);
        toast.error(error.message);
      },
    });

  // Exchange Gmail OAuth2 code for tokens
  const exchangeGmailOAuth2Code =
    api.authProvider.exchangeGmailOAuth2Code.useMutation({
      onSuccess: (data) => {
        setOauthTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        setIsOAuthInProgress(false);
        toast.success("Successfully retrieved Gmail OAuth2 tokens!");
      },
      onError: (error) => {
        setIsOAuthInProgress(false);
        toast.error(error.message);
      },
    });

  // Handle OAuth2 callback from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    if (error) {
      toast.error(`OAuth2 error: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state === "admin_email_setup" && isOAuthInProgress) {
      // Exchange the code for tokens
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      exchangeGmailOAuth2Code.mutate({
        code,
        redirectUri,
      });

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [exchangeGmailOAuth2Code, isOAuthInProgress]);
  const toggleProvider = api.authProvider.toggleEnabled.useMutation({
    onSuccess: () => {
      toast.success("Provider status updated");
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const handleOAuth2Flow = async () => {
    if (!(envStatus as Record<string, boolean>).google) {
      toast.error(
        "Google OAuth2 is not configured in environment variables. Please set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in your .env file.",
      );
      return;
    }

    try {
      setIsOAuthInProgress(true);
      const redirectUri = `${window.location.origin}${window.location.pathname}`;

      // Generate Gmail OAuth2 URL and redirect to Google
      generateGmailOAuth2Url.mutate({ redirectUri });
    } catch (error) {
      setIsOAuthInProgress(false);
      console.error("OAuth2 flow error:", error);
      // Error handling is done in the mutation's onError callback
    }
  };
  const handleSaveProvider = (formData: AuthProviderFormData) => {
    if (selectedProvider && "id" in selectedProvider && selectedProvider.id) {
      // Update existing provider
      updateProvider.mutate({
        id: selectedProvider.id,
        data: formData,
      });
    } else {
      // Create new provider
      createProvider.mutate(formData);
    }
  };

  const handleDeleteProvider = (id: string) => {
    if (confirm("Are you sure you want to delete this provider?")) {
      deleteProvider.mutate({ id });
    }
  };

  const handleToggleProvider = (id: string, enabled: boolean) => {
    toggleProvider.mutate({ id, enabled });
  };
  const isProviderInEnv = (providerName: string) => {
    return (envStatus as Record<string, boolean>)[providerName] ?? false;
  };

  const getProviderByName = (name: string): AuthProviderData | undefined => {
    return (providers as AuthProviderData[]).find(
      (p: AuthProviderData) => p.name === name,
    );
  };

  const getEmailConfigValue = (key: keyof EmailConfig, defaultValue = "") => {
    if (selectedProvider?.emailConfig && selectedProvider.isEmailProvider) {
      const emailConfig =
        selectedProvider.emailConfig as unknown as EmailConfig;
      const value = emailConfig[key];
      return typeof value === "string" || typeof value === "number"
        ? String(value)
        : defaultValue;
    }
    return defaultValue;
  };

  return (
    <SiteAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Site Settings</h1>
          <p className="text-white/80">
            Configure authentication providers and system settings
          </p>
        </div>
        {/* Authentication Providers Section */}
        <div className="rounded-lg border border-white/20 bg-black/85 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Authentication Providers
            </h2>{" "}
            <button
              onClick={() => {
                setSelectedProvider({
                  name: "",
                  displayName: "",
                  clientId: null,
                  clientSecret: null,
                  enabled: false,
                  isEmailProvider: false,
                });
                setEmailAuthType("basic"); // Default to basic auth for new providers
                setOauthTokens({}); // Clear OAuth tokens for new provider
                setIsEditing(true);
              }}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
            >
              Add Custom Provider
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {" "}
            {DEFAULT_PROVIDERS.map((defaultProvider) => {
              const dbProvider = getProviderByName(defaultProvider.name);
              const isInEnv = isProviderInEnv(defaultProvider.name);
              const isEnabled = dbProvider?.enabled ?? isInEnv;

              return (
                <div
                  key={defaultProvider.name}
                  className={`rounded-lg border p-4 transition-all ${
                    isEnabled
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-white">
                      {defaultProvider.displayName}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isInEnv && (
                        <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                          ENV
                        </span>
                      )}
                      <div
                        className={`h-3 w-3 rounded-full ${
                          isEnabled ? "bg-green-500" : "bg-gray-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mb-3 text-sm text-white/60">
                    {isInEnv
                      ? "Configured via environment variables"
                      : dbProvider
                        ? "Configured in database"
                        : "Not configured"}
                  </div>

                  <div className="flex gap-2">
                    {" "}
                    {!isInEnv && (
                      <button
                        onClick={() => {
                          const providerData = dbProvider
                            ? {
                                id: dbProvider.id,
                                name: dbProvider.name,
                                displayName: dbProvider.displayName,
                                clientId: dbProvider.clientId,
                                clientSecret: dbProvider.clientSecret,
                                enabled: dbProvider.enabled,
                                isEmailProvider: dbProvider.isEmailProvider,
                                emailConfig: dbProvider.emailConfig,
                              }
                            : {
                                ...defaultProvider,
                                clientId: null,
                                clientSecret: null,
                                enabled: false,
                              };

                          setSelectedProvider(providerData); // Set email auth type based on existing config
                          if (
                            dbProvider?.emailConfig &&
                            dbProvider.isEmailProvider
                          ) {
                            const emailConfig =
                              dbProvider.emailConfig as unknown as EmailConfig;
                            setEmailAuthType(emailConfig.authType ?? "basic");
                          } else {
                            setEmailAuthType("basic");
                          }

                          setOauthTokens({}); // Clear OAuth tokens when editing existing provider
                          setIsEditing(true);
                        }}
                        className="flex-1 rounded bg-white/10 px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                      >
                        {dbProvider ? "Edit" : "Configure"}
                      </button>
                    )}
                    {dbProvider && !isInEnv && (
                      <button
                        onClick={() =>
                          handleToggleProvider(
                            dbProvider.id,
                            !dbProvider.enabled,
                          )
                        }
                        className={`flex-1 rounded px-3 py-1 text-sm transition-colors ${
                          dbProvider.enabled
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        }`}
                      >
                        {dbProvider.enabled ? "Disable" : "Enable"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom providers from database */}
          {providers.filter(
            (p) => !DEFAULT_PROVIDERS.some((dp) => dp.name === p.name),
          ).length > 0 && (
            <div className="mt-6">
              <h3 className="mb-4 text-lg font-medium text-white">
                Custom Providers
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {providers
                  .filter(
                    (p) => !DEFAULT_PROVIDERS.some((dp) => dp.name === p.name),
                  )
                  .map((provider) => (
                    <div
                      key={provider.id}
                      className={`rounded-lg border p-4 transition-all ${
                        provider.enabled
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-medium text-white">
                          {provider.displayName}
                        </h3>
                        <div
                          className={`h-3 w-3 rounded-full ${
                            provider.enabled ? "bg-green-500" : "bg-gray-500"
                          }`}
                        />
                      </div>

                      <div className="mb-3 text-sm text-white/60">
                        Custom provider ({provider.name})
                      </div>

                      <div className="flex gap-2">
                        {" "}
                        <button
                          onClick={() => {
                            setSelectedProvider({
                              id: provider.id,
                              name: provider.name,
                              displayName: provider.displayName,
                              clientId: provider.clientId,
                              clientSecret: provider.clientSecret,
                              enabled: provider.enabled,
                              isEmailProvider: provider.isEmailProvider,
                              emailConfig: provider.emailConfig,
                            }); // Set email auth type based on existing config
                            if (
                              provider.emailConfig &&
                              provider.isEmailProvider
                            ) {
                              const emailConfig =
                                provider.emailConfig as unknown as EmailConfig;
                              setEmailAuthType(emailConfig.authType ?? "basic");
                            } else {
                              setEmailAuthType("basic");
                            }

                            setOauthTokens({}); // Clear OAuth tokens when editing existing provider
                            setIsEditing(true);
                          }}
                          className="flex-1 rounded bg-white/10 px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleToggleProvider(provider.id, !provider.enabled)
                          }
                          className={`flex-1 rounded px-3 py-1 text-sm transition-colors ${
                            provider.enabled
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                        >
                          {provider.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-400 transition-colors hover:bg-red-500/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        {/* Provider Configuration Modal */}{" "}
        {isEditing && selectedProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/20 bg-black/90 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-white">
                {selectedProvider.id ? "Edit Provider" : "Add Provider"}
              </h3>{" "}
              <form
                data-oauth-form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget); // Build email configuration if this is an email provider
                  let emailConfig: JsonValue | null = null;
                  if (formData.get("isEmailProvider") === "on") {
                    const authType = emailAuthType;
                    const config: EmailConfig = {
                      authType,
                      host: formData.get("emailHost") as string,
                      port: parseInt(formData.get("emailPort") as string),
                      from: formData.get("emailFrom") as string,
                      user: formData.get("emailUser") as string,
                    };
                    if (authType === "basic") {
                      config.password = formData.get("emailPassword") as string;
                    } else if (authType === "oauth2") {
                      // Client credentials will be automatically added on the server side
                      config.refreshToken = formData.get(
                        "emailRefreshToken",
                      ) as string;
                      config.accessToken = formData.get(
                        "emailAccessToken",
                      ) as string;
                    }

                    emailConfig = config as unknown as JsonValue;
                  }

                  handleSaveProvider({
                    name: formData.get("name") as string,
                    displayName: formData.get("displayName") as string,
                    clientId: (formData.get("clientId") as string) ?? null,
                    clientSecret:
                      (formData.get("clientSecret") as string) ?? null,
                    enabled: formData.get("enabled") === "on",
                    isEmailProvider: formData.get("isEmailProvider") === "on",
                    emailConfig,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">
                    Provider Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={selectedProvider.name}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., custom-oauth"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">
                    Display Name
                  </label>
                  <input
                    name="displayName"
                    type="text"
                    defaultValue={selectedProvider.displayName}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., Custom OAuth"
                    required
                  />
                </div>{" "}
                {!selectedProvider.isEmailProvider && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-white/80">
                        Client ID
                      </label>{" "}
                      <input
                        name="clientId"
                        type="text"
                        defaultValue={selectedProvider.clientId ?? ""}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                        placeholder="Your OAuth client ID"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-white/80">
                        Client Secret
                      </label>
                      <input
                        name="clientSecret"
                        type="password"
                        defaultValue={selectedProvider.clientSecret ?? ""}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                        placeholder="Your OAuth client secret"
                      />
                    </div>
                  </>
                )}
                {selectedProvider.isEmailProvider && (
                  <div className="space-y-4 border-t border-white/20 pt-4">
                    <h4 className="text-md font-medium text-white">
                      Email Configuration
                    </h4>
                    {/* Authentication Type Selector */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Authentication Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex cursor-pointer items-center space-x-2">
                          <input
                            type="radio"
                            name="emailAuthType"
                            value="basic"
                            checked={emailAuthType === "basic"}
                            onChange={(e) =>
                              setEmailAuthType(
                                e.target.value as "basic" | "oauth2",
                              )
                            }
                            className="h-4 w-4 text-purple-600"
                          />
                          <span className="text-sm text-white/80">
                            Username/Password
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center space-x-2">
                          <input
                            type="radio"
                            name="emailAuthType"
                            value="oauth2"
                            checked={emailAuthType === "oauth2"}
                            onChange={(e) =>
                              setEmailAuthType(
                                e.target.value as "basic" | "oauth2",
                              )
                            }
                            className="h-4 w-4 text-purple-600"
                          />
                          <span className="text-sm text-white/80">
                            OAuth2 (Gmail)
                          </span>
                        </label>
                      </div>
                    </div>
                    {/* Common Email Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-white/80">
                          SMTP Host
                        </label>{" "}
                        <input
                          name="emailHost"
                          type="text"
                          defaultValue={getEmailConfigValue(
                            "host",
                            "smtp.gmail.com",
                          )}
                          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                          placeholder="e.g., smtp.gmail.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-white/80">
                          Port
                        </label>
                        <input
                          name="emailPort"
                          type="number"
                          defaultValue={getEmailConfigValue("port", "587")}
                          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                          placeholder="587"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-white/80">
                        From Email Address
                      </label>
                      <input
                        name="emailFrom"
                        type="email"
                        defaultValue={getEmailConfigValue("from")}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                        placeholder="noreply@yourdomain.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-white/80">
                        Email Username
                      </label>
                      <input
                        name="emailUser"
                        type="email"
                        defaultValue={getEmailConfigValue("user")}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                        placeholder="your-email@gmail.com"
                        required
                      />
                    </div>
                    {/* Basic Auth Fields */}
                    {emailAuthType === "basic" && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-white/80">
                          Password / App Password
                        </label>
                        <input
                          name="emailPassword"
                          type="password"
                          defaultValue={getEmailConfigValue("password")}
                          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                          placeholder="Your email password or app password"
                        />
                        <p className="mt-1 text-xs text-white/60">
                          For Gmail, use an App Password instead of your regular
                          password
                        </p>
                      </div>
                    )}{" "}
                    {/* OAuth2 Fields */}
                    {emailAuthType === "oauth2" && (
                      <>
                        {" "}
                        {/* Info about Gmail OAuth2 for admin email setup */}
                        <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                          <div className="flex items-start gap-3">
                            <svg
                              className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div>
                              <h5 className="mb-1 text-sm font-medium text-blue-400">
                                Gmail OAuth2 for Email Sending
                              </h5>
                              <p className="text-xs text-blue-300/80">
                                This will request Gmail access permissions
                                specifically for sending emails from your Secret
                                Santa application. This is separate from regular
                                user authentication and only asks for Gmail
                                scope when needed for admin email setup.
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Authenticate with Google Button */}
                        <div className="flex justify-center py-2">
                          <button
                            type="button"
                            onClick={handleOAuth2Flow}
                            disabled={
                              isOAuthInProgress ||
                              !(envStatus as Record<string, boolean>).google ||
                              generateGmailOAuth2Url.isPending
                            }
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-600/50"
                          >
                            {isOAuthInProgress ||
                            generateGmailOAuth2Url.isPending ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                                {generateGmailOAuth2Url.isPending
                                  ? "Redirecting to Google..."
                                  : "Processing tokens..."}
                              </>
                            ) : !(envStatus as Record<string, boolean>)
                                .google ? (
                              <>
                                <svg
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Google OAuth2 Not Configured
                              </>
                            ) : (
                              <>
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                  <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  />
                                  <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  />
                                  <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                  />
                                  <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  />
                                </svg>
                                Authorize Gmail Access for Email Sending
                              </>
                            )}
                          </button>
                        </div>
                        {!(envStatus as Record<string, boolean>).google && (
                          <p className="mt-2 text-center text-xs text-orange-400">
                            Please configure AUTH_GOOGLE_ID and
                            AUTH_GOOGLE_SECRET in your .env file first
                          </p>
                        )}
                        <div>
                          <label className="mb-1 block text-sm font-medium text-white/80">
                            OAuth2 Refresh Token
                          </label>{" "}
                          <input
                            name="emailRefreshToken"
                            type="password"
                            value={
                              oauthTokens.refreshToken ??
                              getEmailConfigValue("refreshToken")
                            }
                            onChange={(e) =>
                              setOauthTokens((prev) => ({
                                ...prev,
                                refreshToken: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                            placeholder="OAuth2 Refresh Token"
                          />{" "}
                          <p className="mt-1 text-xs text-white/60">
                            Click the button above to automatically retrieve
                            tokens from Google for Gmail access
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-white/80">
                            OAuth2 Access Token (Optional)
                          </label>{" "}
                          <input
                            name="emailAccessToken"
                            type="password"
                            value={
                              oauthTokens.accessToken ??
                              getEmailConfigValue("accessToken")
                            }
                            onChange={(e) =>
                              setOauthTokens((prev) => ({
                                ...prev,
                                accessToken: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                            placeholder="OAuth2 Access Token (auto-generated if empty)"
                          />
                          <p className="mt-1 text-xs text-white/60">
                            Auto-populated from Google account, leave empty to
                            generate from refresh token
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={selectedProvider.enabled}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                  />
                  <label className="text-sm text-white/80">
                    Enable this provider
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    name="isEmailProvider"
                    type="checkbox"
                    defaultChecked={selectedProvider.isEmailProvider}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                  />
                  <label className="text-sm text-white/80">
                    Email provider (Magic Links)
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={
                      createProvider.isPending || updateProvider.isPending
                    }
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:bg-purple-600/50"
                  >
                    {createProvider.isPending || updateProvider.isPending
                      ? "Saving..."
                      : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider(null);
                      setIsEditing(false);
                      setOauthTokens({}); // Clear OAuth tokens when closing modal
                      setIsOAuthInProgress(false); // Reset OAuth progress state
                    }}
                    className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* System Information */}
        <div className="rounded-lg border border-white/20 bg-black/85 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">
            System Information
          </h2>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="text-white/60">Environment:</span>
              <span className="ml-2 text-white">{process.env.NODE_ENV}</span>
            </div>
            <div>
              <span className="text-white/60">Total Providers:</span>
              <span className="ml-2 text-white">{providers.length}</span>
            </div>
            <div>
              <span className="text-white/60">Active Providers:</span>
              <span className="ml-2 text-white">
                {providers.filter((p) => p.enabled).length}
              </span>
            </div>
            <div>
              <span className="text-white/60">ENV Providers:</span>
              <span className="ml-2 text-white">
                {Object.values(envStatus).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SiteAdminLayout>
  );
}

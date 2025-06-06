"use client";

import { SiteAdminLayout } from "~/app/_components/site-admin-layout";
import { api } from "~/trpc/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import type { JsonValue } from "@prisma/client/runtime/library";

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
  { name: "nodemailer", displayName: "Email (Magic Links)", isEmailProvider: true },
];

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState<AuthProviderFormData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Queries
  const { data: providers = [], refetch: refetchProviders } = api.authProvider.getAll.useQuery() as {
    data: AuthProviderData[] | undefined;
    refetch: () => void;
  };
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
  });

  const toggleProvider = api.authProvider.toggleEnabled.useMutation({
    onSuccess: () => {
      toast.success("Provider status updated");
      void refetchProviders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
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
    return providers.find((p: AuthProviderData) => p.name === name);
  };

  return (
    <SiteAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Site Settings</h1>
          <p className="text-white/80">Configure authentication providers and system settings</p>
        </div>

        {/* Authentication Providers Section */}
        <div className="bg-black/85 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Authentication Providers</h2>
            <button              onClick={() => {
                setSelectedProvider({
                  name: "",
                  displayName: "",
                  clientId: null,
                  clientSecret: null,
                  enabled: false,
                  isEmailProvider: false,
                });
                setIsEditing(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Add Custom Provider
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">            {DEFAULT_PROVIDERS.map((defaultProvider) => {
              const dbProvider = getProviderByName(defaultProvider.name);
              const isInEnv = isProviderInEnv(defaultProvider.name);
              const isEnabled = dbProvider?.enabled ?? isInEnv;

              return (
                <div
                  key={defaultProvider.name}
                  className={`p-4 rounded-lg border transition-all ${
                    isEnabled
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white">{defaultProvider.displayName}</h3>
                    <div className="flex items-center gap-2">
                      {isInEnv && (
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                          ENV
                        </span>
                      )}
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isEnabled ? "bg-green-500" : "bg-gray-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-white/60 mb-3">
                    {isInEnv
                      ? "Configured via environment variables"
                      : dbProvider
                      ? "Configured in database"
                      : "Not configured"}
                  </div>

                  <div className="flex gap-2">                    {!isInEnv && (
                      <button
                        onClick={() => {
                          setSelectedProvider(
                            dbProvider ? {
                              id: dbProvider.id,
                              name: dbProvider.name,
                              displayName: dbProvider.displayName,
                              clientId: dbProvider.clientId,
                              clientSecret: dbProvider.clientSecret,
                              enabled: dbProvider.enabled,
                              isEmailProvider: dbProvider.isEmailProvider,
                              emailConfig: dbProvider.emailConfig,
                            } : {
                              ...defaultProvider,
                              clientId: null,
                              clientSecret: null,
                              enabled: false,
                            }
                          );
                          setIsEditing(true);
                        }}
                        className="flex-1 px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                      >
                        {dbProvider ? "Edit" : "Configure"}
                      </button>
                    )}

                    {dbProvider && !isInEnv && (
                      <button
                        onClick={() => handleToggleProvider(dbProvider.id, !dbProvider.enabled)}
                        className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
                          dbProvider.enabled
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
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
          {providers.filter(p => !DEFAULT_PROVIDERS.some(dp => dp.name === p.name)).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Custom Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers
                  .filter(p => !DEFAULT_PROVIDERS.some(dp => dp.name === p.name))
                  .map((provider) => (
                    <div
                      key={provider.id}
                      className={`p-4 rounded-lg border transition-all ${
                        provider.enabled
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-white">{provider.displayName}</h3>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            provider.enabled ? "bg-green-500" : "bg-gray-500"
                          }`}
                        />
                      </div>

                      <div className="text-sm text-white/60 mb-3">
                        Custom provider ({provider.name})
                      </div>

                      <div className="flex gap-2">                        <button
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
                            });
                            setIsEditing(true);
                          }}
                          className="flex-1 px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleProvider(provider.id, !provider.enabled)}
                          className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
                            provider.enabled
                              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                              : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                          }`}
                        >
                          {provider.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
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

        {/* Provider Configuration Modal */}
        {isEditing && selectedProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 p-6">              <h3 className="text-lg font-semibold text-white mb-4">
                {selectedProvider.id ? "Edit Provider" : "Add Provider"}
              </h3>

              <form                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);                  handleSaveProvider({
                    name: formData.get("name") as string,
                    displayName: formData.get("displayName") as string,
                    clientId: (formData.get("clientId") as string) ?? null,
                    clientSecret: (formData.get("clientSecret") as string) ?? null,
                    enabled: formData.get("enabled") === "on",
                    isEmailProvider: formData.get("isEmailProvider") === "on",
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Provider Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={selectedProvider.name}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., custom-oauth"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Display Name
                  </label>
                  <input
                    name="displayName"
                    type="text"
                    defaultValue={selectedProvider.displayName}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g., Custom OAuth"
                    required
                  />
                </div>

                {!selectedProvider.isEmailProvider && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Client ID
                      </label>                      <input
                        name="clientId"
                        type="text"
                        defaultValue={selectedProvider.clientId ?? ""}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                        placeholder="Your OAuth client ID"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        Client Secret
                      </label>
                      <input
                        name="clientSecret"
                        type="password"
                        defaultValue={selectedProvider.clientSecret ?? ""}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
                        placeholder="Your OAuth client secret"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={selectedProvider.enabled}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                  />
                  <label className="text-sm text-white/80">Enable this provider</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    name="isEmailProvider"
                    type="checkbox"
                    defaultChecked={selectedProvider.isEmailProvider}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                  />
                  <label className="text-sm text-white/80">Email provider (Magic Links)</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createProvider.isPending || updateProvider.isPending}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
                  >
                    {createProvider.isPending || updateProvider.isPending ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider(null);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* System Information */}
        <div className="bg-black/85 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Environment:</span>
              <span className="text-white ml-2">{process.env.NODE_ENV}</span>
            </div>
            <div>
              <span className="text-white/60">Total Providers:</span>
              <span className="text-white ml-2">{providers.length}</span>
            </div>
            <div>
              <span className="text-white/60">Active Providers:</span>
              <span className="text-white ml-2">
                {providers.filter(p => p.enabled).length}
              </span>
            </div>
            <div>
              <span className="text-white/60">ENV Providers:</span>
              <span className="text-white ml-2">
                {Object.values(envStatus).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SiteAdminLayout>
  );
}

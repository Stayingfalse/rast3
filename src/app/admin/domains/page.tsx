"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { AdminLayout } from "~/app/_components/admin-layout";

// Define the type manually based on the Prisma include in the domain router
type DomainWithCount = {
  id: string;
  name: string;
  enabled: boolean;
  createdById: string | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  _count: {
    departments: number;
  };
};

export default function DomainsPage() {
  return (
    <AdminLayout>
      <DomainManagement />
    </AdminLayout>
  );
}

function DomainManagement() {
  const [newDomainName, setNewDomainName] = useState("");
  const [newDomainEnabled, setNewDomainEnabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // Get user profile to check permissions
  const { data: userProfile } = api.profile.getCurrentProfile.useQuery();

  // Get all domains
  const { data: domains, refetch } = api.domain.getAll.useQuery();

  const [editingDomain, setEditingDomain] = useState<DomainWithCount | null>(
    null,
  );

  const createDomainMutation = api.domain.create.useMutation({
    onSuccess: () => {
      setNewDomainName("");
      setNewDomainEnabled(false);
      setIsCreating(false);
      void refetch();
    },
    onError: (error) => {
      alert(`Failed to create domain: ${error.message}`);
      setIsCreating(false);
    },
  });

  const updateDomainMutation = api.domain.update.useMutation({
    onSuccess: () => {
      setEditingDomain(null);
      void refetch();
    },
    onError: (error) => {
      alert(`Failed to update domain: ${error.message}`);
    },
  });

  const deleteDomainMutation = api.domain.delete.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: (error) => {
      alert(`Failed to delete domain: ${error.message}`);
    },
  });

  const toggleEnabledMutation = api.domain.toggleEnabled.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    setIsCreating(true);
    try {
      await createDomainMutation.mutateAsync({
        name: newDomainName.trim(),
        enabled: newDomainEnabled,
      });
    } catch {
      setIsCreating(false);
    }
  };

  const handleUpdateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDomain) return;

    try {
      await updateDomainMutation.mutateAsync({
        id: editingDomain.id,
        name: editingDomain.name,
        enabled: editingDomain.enabled,
      });
    } catch {
      // Error handled in mutation
    }
  };
  const handleDeleteDomain = (domain: DomainWithCount) => {
    if (
      confirm(`Are you sure you want to delete the domain "${domain.name}"?`)
    ) {
      deleteDomainMutation.mutate({ id: domain.id });
    }
  };
  const handleToggleEnabled = (domain: DomainWithCount) => {
    toggleEnabledMutation.mutate({ id: domain.id });
  };

  // Check if user can create domains (only SITE admins)
  const canCreateDomains = userProfile?.adminLevel === "SITE";

  return (
    <div className="w-full max-w-6xl">
      <h1 className="mb-8 text-3xl font-bold text-white">Domain Management</h1>

      {/* Create New Domain - Only show to SITE admins */}
      {canCreateDomains && (
        <div className="mb-8 rounded-lg bg-black/85 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">
            Add New Domain
          </h2>
          <form onSubmit={handleCreateDomain} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="domainName"
                  className="block text-sm font-medium text-white"
                >
                  Domain Name *
                </label>{" "}
                <input
                  type="text"
                  id="domainName"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-white/20 bg-black/85 px-3 py-2 text-white placeholder-white/60 shadow-sm backdrop-blur-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
                  placeholder="e.g., company.com, example.org"
                  required
                />
              </div>{" "}
            </div>
            <div className="flex items-center">
              {" "}
              <input
                type="checkbox"
                id="domainEnabled"
                checked={newDomainEnabled}
                onChange={(e) => setNewDomainEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/85 text-purple-600 backdrop-blur-sm focus:ring-purple-500"
              />
              <label
                htmlFor="domainEnabled"
                className="ml-2 text-sm text-white"
              >
                Enable domain immediately
              </label>
            </div>
            <button
              type="submit"
              disabled={isCreating || !newDomainName.trim()}
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                "Add Domain"
              )}
            </button>{" "}
          </form>
        </div>
      )}

      {/* Existing Domains */}
      <div className="rounded-lg bg-black/85 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Existing Domains
        </h2>

        {domains && domains.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/5">
                {" "}
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Status
                  </th>{" "}
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Departments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>{" "}
              <tbody className="divide-y divide-white/10">
                {domains?.map((domain: DomainWithCount) => (
                  <tr key={domain.id}>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-white">
                      {" "}
                      {editingDomain?.id === domain.id ? (
                        <input
                          type="text"
                          value={editingDomain.name}
                          onChange={(e) =>
                            editingDomain &&
                            setEditingDomain({
                              ...editingDomain,
                              name: e.target.value,
                            })
                          }
                          className="rounded border border-white/20 bg-black/85 px-2 py-1 text-white backdrop-blur-sm"
                        />
                      ) : (
                        domain.name
                      )}{" "}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {editingDomain?.id === domain.id ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editingDomain.enabled}
                            onChange={(e) =>
                              editingDomain &&
                              setEditingDomain({
                                ...editingDomain,
                                enabled: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-white/20 bg-black/85 text-purple-600 backdrop-blur-sm"
                          />
                          <span className="ml-2 text-white">Enabled</span>
                        </label>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            domain.enabled
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          {domain.enabled ? "Enabled" : "Disabled"}
                        </span>
                      )}
                    </td>{" "}
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-white/80">
                      {domain._count?.departments ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/80">
                      {domain.createdBy ? (
                        <div>
                          <div className="font-medium">
                            {domain.createdBy.firstName}{" "}
                            {domain.createdBy.lastName}
                          </div>
                          {domain.createdBy.email && (
                            <div className="text-xs text-white/60">
                              {domain.createdBy.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/40 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {editingDomain?.id === domain.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateDomain}
                            className="text-green-400 hover:text-green-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDomain(null)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingDomain(domain)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleEnabled(domain)}
                            className={
                              domain.enabled
                                ? "text-red-400 hover:text-red-300"
                                : "text-green-400 hover:text-green-300"
                            }
                          >
                            {domain.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(domain)}
                            className="text-red-400 hover:text-red-300"
                            disabled={(domain._count?.departments ?? 0) > 0}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-white/60">
              No domains found. Add one above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

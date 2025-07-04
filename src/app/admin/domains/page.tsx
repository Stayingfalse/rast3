"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";

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
      toast.error(`Failed to create domain: ${error.message}`);
      setIsCreating(false);
    },
  });

  const updateDomainMutation = api.domain.update.useMutation({
    onSuccess: () => {
      setEditingDomain(null);
      void refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update domain: ${error.message}`);
    },
  });

  const deleteDomainMutation = api.domain.delete.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete domain: ${error.message}`);
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
    // Using toast with a custom confirmation
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span>Are you sure you want to delete the domain &quot;{domain.name}&quot;?</span>
        <div className="flex gap-2">
          <button
            className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
            onClick={() => {
              toast.dismiss(t.id);
              deleteDomainMutation.mutate({ id: domain.id });
            }}
          >
            Yes, Delete
          </button>
          <button
            className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };
  const handleToggleEnabled = (domain: DomainWithCount) => {
    toggleEnabledMutation.mutate({ id: domain.id });
  };

  // Check if user can create domains (only SITE admins)
  const canCreateDomains = userProfile?.adminLevel === "SITE";
  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Domain Management</h1>
      </div>

      {/* Create New Domain - Only show to SITE admins */}
      {canCreateDomains && (
        <div className="mb-6 rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:mb-8 sm:p-6">          <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
            Add New Domain
          </h2>
          <form onSubmit={handleCreateDomain} className="space-y-4">
            <div>
              <label
                htmlFor="domainName"
                className="block text-sm font-medium text-white"
              >
                Domain Name *
              </label>
              <input
                type="text"
                id="domainName"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-white/20 bg-black/85 px-3 py-2 text-white placeholder-white/60 shadow-sm backdrop-blur-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
                placeholder="e.g., company.com, example.org"
                required
              />
            </div>
            <div className="flex items-center">
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
              className="w-full inline-flex justify-center items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
      )}      {/* Existing Domains */}
      <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
          Existing Domains
        </h2>

        {domains && domains.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-white/20">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                      Status
                    </th>
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
                </thead>
                <tbody className="divide-y divide-white/10">
                  {domains?.map((domain: DomainWithCount) => (
                    <tr key={domain.id}>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-white">
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
                        )}
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
                      </td>
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

            {/* Mobile Card View */}
            <div className="space-y-4 lg:hidden">
              {domains?.map((domain: DomainWithCount) => (
                <div key={domain.id} className="rounded-lg bg-white/5 p-4">
                  {editingDomain?.id === domain.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Domain Name
                        </label>
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
                          className="w-full rounded border border-white/20 bg-black/85 px-3 py-2 text-white backdrop-blur-sm"
                        />
                      </div>
                      <div>
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
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateDomain}
                          className="flex-1 rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDomain(null)}
                          className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-white truncate">
                            {domain.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                domain.enabled
                                  ? "bg-green-600 text-white"
                                  : "bg-red-600 text-white"
                              }`}
                            >
                              {domain.enabled ? "Enabled" : "Disabled"}
                            </span>
                            <span className="text-sm text-white/60">
                              {domain._count?.departments ?? 0} departments
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {domain.createdBy && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-sm text-white/60">Created by</p>
                          <p className="text-sm text-white">
                            {domain.createdBy.firstName} {domain.createdBy.lastName}
                          </p>
                          {domain.createdBy.email && (
                            <p className="text-xs text-white/50">
                              {domain.createdBy.email}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => setEditingDomain(domain)}
                          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleEnabled(domain)}
                          className={`rounded px-3 py-1.5 text-sm text-white ${
                            domain.enabled
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {domain.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteDomain(domain)}
                          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={(domain._count?.departments ?? 0) > 0}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
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

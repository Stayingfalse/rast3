"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";

// Define types based on what's returned from the API
type Department = {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
};

type DepartmentsByDomain = Record<string, Department[]>;

export default function DepartmentsPage() {
  return (
    <AdminLayout>
      <DepartmentManagement />
    </AdminLayout>
  );
}

function DepartmentManagement() {
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentDomain, setNewDepartmentDomain] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Get current user profile to check permissions
  const { data: userProfile } = api.profile.getCurrentProfile.useQuery();

  // Get departments and domains (now scoped based on user's admin level)
  const { data: departments, refetch } =
    api.profile.getDepartmentsByDomain.useQuery({
      domain: "all",
    });

  const { data: domains } = api.domain.getAll.useQuery();

  // Check if user can create departments (SITE or DOMAIN admins only)
  const canCreateDepartments =
    userProfile?.adminLevel === "SITE" || userProfile?.adminLevel === "DOMAIN";

  const createDepartmentMutation = api.profile.createDepartment.useMutation({
    onSuccess: () => {
      setNewDepartmentName("");
      setNewDepartmentDomain("");
      setIsCreating(false);
      void refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create department: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim() || !newDepartmentDomain.trim()) return;

    setIsCreating(true);
    try {
      await createDepartmentMutation.mutateAsync({
        name: newDepartmentName.trim(),
        domain: newDepartmentDomain.trim().toLowerCase(),
      });
    } catch {
      setIsCreating(false);
    }
  };
  // Group departments by domain
  const departmentsByDomain: DepartmentsByDomain =
    departments?.reduce((acc: DepartmentsByDomain, dept: Department) => {
      const domain = dept.domain;
      acc[domain] ??= [];
      acc[domain].push(dept);
      return acc;
    }, {}) ?? {};
  return (
    <div className="w-full max-w-6xl p-4 sm:p-6">
      <h1 className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-bold text-white">
        Department Management
      </h1>{" "}
      {/* Domain Status Overview */}
      <div className="mb-6 sm:mb-8 rounded-lg bg-black/85 p-4 sm:p-6 backdrop-blur-sm">
        <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">Domain Status</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">          {domains?.map((domain) => (
            <div key={domain.id} className="rounded-lg bg-white/5 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white text-sm sm:text-base">{domain.name}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    domain.enabled
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {domain.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>{" "}
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                {(domain as { _count?: { departments: number } })._count
                  ?.departments ?? 0}{" "}
                departments
              </p>
            </div>
          ))}{" "}
        </div>
      </div>      {/* Create New Department - Only for SITE and DOMAIN admins */}
      {canCreateDepartments && (
        <div className="mb-6 sm:mb-8 rounded-lg bg-black/85 p-4 sm:p-6 backdrop-blur-sm">
          <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">
            Add New Department
          </h2>
          <form onSubmit={handleCreateDepartment} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="departmentName"
                  className="block text-sm font-medium text-white"
                >
                  Department Name *
                </label>
                <input
                  type="text"
                  id="departmentName"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-white/20 bg-black/85 px-3 py-2 text-white placeholder-white/60 shadow-sm backdrop-blur-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
                  placeholder="e.g., Engineering, Marketing, Sales"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="departmentDomain"
                  className="block text-sm font-medium text-white"
                >
                  Domain *
                </label>
                <select
                  id="departmentDomain"
                  value={newDepartmentDomain}
                  onChange={(e) => setNewDepartmentDomain(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-white/20 bg-black/85 px-3 py-2 text-white shadow-sm backdrop-blur-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
                  required
                >
                  <option value="">Select a domain...</option>
                  {domains
                    ?.filter((d) => d.enabled)
                    .map((domain) => (
                      <option
                        key={domain.id}
                        value={domain.name}
                        className="bg-gray-800"
                      >
                        {domain.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>            <button
              type="submit"
              disabled={
                isCreating ||
                !newDepartmentName.trim() ||
                !newDepartmentDomain.trim()
              }
              className="w-full sm:w-auto inline-flex justify-center items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                "Add Department"
              )}
            </button>{" "}
          </form>
        </div>
      )}
      {/* Departments by Domain */}
      <div className="space-y-6">
        {Object.entries(departmentsByDomain).map(([domainName, depts]) => {
          const domain = domains?.find((d) => d.name === domainName);
          return (            <div
              key={domainName}
              className="rounded-lg bg-black/85 p-4 sm:p-6 backdrop-blur-sm"
            >
              <div className="mb-3 sm:mb-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  {domainName}
                </h2>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    domain?.enabled
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {domain?.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              {depts.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/20">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                            Department Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>{" "}
                      <tbody className="divide-y divide-white/10">
                        {depts.map((department: Department) => (
                          <tr key={department.id}>
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-white">
                              {department.name}
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-white/80">
                              {new Date(
                                department.createdAt,
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              <button className="mr-2 text-blue-400 hover:text-blue-300">
                                Edit
                              </button>
                              <button className="text-red-400 hover:text-red-300">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-3">
                    {depts.map((department: Department) => (
                      <div key={department.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-white text-lg">
                            {department.name}
                          </h3>
                        </div>
                        <div className="text-sm text-white/60 mb-3">
                          Created: {new Date(department.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                            Edit
                          </button>
                          <button className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-6 sm:py-4 text-center">
                  <p className="text-white/60 text-sm sm:text-base">
                    No departments in this domain yet.
                  </p>
                </div>
              )}
            </div>
          );
        })}        {Object.keys(departmentsByDomain).length === 0 && (
          <div className="py-6 sm:py-8 text-center">
            <p className="text-white/60 text-sm sm:text-base">
              No departments found. Create one above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

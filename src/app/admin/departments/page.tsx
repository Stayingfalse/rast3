"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { AdminLayout } from "~/app/_components/admin-layout";

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

  // Get all departments and domains
  const { data: departments, refetch } = api.profile.getDepartmentsByDomain.useQuery({
    domain: "all",
  });
  
  const { data: domains } = api.domain.getAll.useQuery();

  const createDepartmentMutation = api.profile.createDepartment.useMutation({
    onSuccess: () => {
      setNewDepartmentName("");
      setNewDepartmentDomain("");
      setIsCreating(false);
      void refetch();
    },
    onError: (error) => {
      alert(`Failed to create department: ${error.message}`);
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
    } catch (error) {
      setIsCreating(false);
    }
  };

  // Group departments by domain
  const departmentsByDomain = departments?.reduce((acc: any, dept: any) => {
    const domain = dept.domainName || dept.domain;
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(dept);
    return acc;
  }, {}) || {};

  return (
    <div className="w-full max-w-6xl">
      <h1 className="mb-8 text-3xl font-bold text-white">
        Department Management
      </h1>

      {/* Domain Status Overview */}
      <div className="mb-8 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">Domain Status</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domains?.map((domain: any) => (
            <div key={domain.id} className="rounded-lg bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">{domain.name}</h3>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  domain.enabled 
                    ? "bg-green-600 text-white" 
                    : "bg-red-600 text-white"
                }`}>
                  {domain.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/60">
                {domain._count?.departments || 0} departments
              </p>
              {domain.description && (
                <p className="mt-1 text-xs text-white/50">{domain.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create New Department */}
      <div className="mb-8 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Add New Department
        </h2>
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="departmentName" className="block text-sm font-medium text-white">
                Department Name *
              </label>
              <input
                type="text"
                id="departmentName"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                placeholder="e.g., Engineering, Marketing, Sales"
                required
              />
            </div>
            <div>
              <label htmlFor="departmentDomain" className="block text-sm font-medium text-white">
                Domain *
              </label>
              <select
                id="departmentDomain"
                value={newDepartmentDomain}
                onChange={(e) => setNewDepartmentDomain(e.target.value)}
                className="mt-1 block w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white shadow-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                required
              >
                <option value="">Select a domain...</option>
                {domains?.filter((d: any) => d.enabled).map((domain: any) => (
                  <option key={domain.id} value={domain.name} className="bg-gray-800">
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isCreating || !newDepartmentName.trim() || !newDepartmentDomain.trim()}
            className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating...
              </>
            ) : (
              "Add Department"
            )}
          </button>
        </form>
      </div>

      {/* Departments by Domain */}
      <div className="space-y-6">
        {Object.entries(departmentsByDomain).map(([domainName, depts]) => {
          const domain = domains?.find((d: any) => d.name === domainName);
          return (
            <div key={domainName} className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {domainName}
                </h2>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  domain?.enabled 
                    ? "bg-green-600 text-white" 
                    : "bg-red-600 text-white"
                }`}>
                  {domain?.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              
              {(depts as any[]).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/80">
                          Department Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/80">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/80">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(depts as any[]).map((department: any) => (
                        <tr key={department.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                            {department.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-white/80">
                            {new Date(department.createdAt).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <button className="text-blue-400 hover:text-blue-300 mr-2">
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
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/60">No departments in this domain yet.</p>
                </div>
              )}
            </div>
          );
        })}
        
        {Object.keys(departmentsByDomain).length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/60">No departments found. Create one above to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

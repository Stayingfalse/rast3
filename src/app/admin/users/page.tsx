"use client";

import { useState } from "react";
import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";

export default function UsersPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  
  const { data: users = [], refetch } = api.user.getAll.useQuery();
  const { data: stats } = api.user.getStats.useQuery();
  const { data: domains = [] } = api.domain.getAll.useQuery();
  const { data: departments = [] } = api.profile.getDepartmentsByDomain.useQuery(
    { domain: "all" }
  );

  const toggleProfileMutation = api.user.toggleProfileCompletion.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const updateDepartmentMutation = api.user.updateDepartment.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const deleteUserMutation = api.user.delete.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  // Filter users by selected domain
  const filteredUsers = selectedDomain === "all" 
    ? users 
    : users.filter(user => user.domain === selectedDomain);

  const handleToggleProfile = (userId: string, currentStatus: boolean) => {
    toggleProfileMutation.mutate({
      userId,
      completed: !currentStatus,
    });
  };

  const handleUpdateDepartment = (userId: string, departmentId: string | null) => {
    updateDepartmentMutation.mutate({
      userId,
      departmentId,
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate({ userId });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-white/80">Manage user profiles and permissions</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">Total Users</p>
                  <p className="text-lg font-semibold text-white">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">Completed Profiles</p>
                  <p className="text-lg font-semibold text-white">{stats.completedProfiles}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">Pending Profiles</p>
                  <p className="text-lg font-semibold text-white">{stats.pendingProfiles}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18h15.75m-15.75 0V9.75m0 11.25h15.75M7.5 6.75h.75m.75 0h.75m.75 0h.75m0 0V18m-7.5 0V6.75" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">Domains</p>
                  <p className="text-lg font-semibold text-white">{domains.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Domain Filter */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-4">
            <label htmlFor="domain-filter" className="text-sm font-medium text-white">
              Filter by Domain:
            </label>
            <select
              id="domain-filter"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Domains</option>
              {domains.map((domain) => (
                <option key={domain.name} value={domain.name}>
                  {domain.name} ({domain.enabled ? "Enabled" : "Disabled"})
                </option>
              ))}
            </select>
            <span className="text-sm text-white/60">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-lg font-semibold text-white">Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Email & Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.firstName?.[0] ?? user.name?.[0] ?? "?"}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user.name || "Unknown User"
                            }
                          </div>
                          <div className="text-sm text-white/60">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {user.workEmail || user.email || "No email"}
                      </div>
                      <div className="text-sm text-white/60">
                        {user.domain || "No domain"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.departmentId || ""}
                        onChange={(e) => handleUpdateDepartment(user.id, e.target.value || null)}
                        className="text-sm rounded border border-gray-300 bg-white px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={updateDepartmentMutation.isPending}
                      >
                        <option value="">No Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({dept.domain})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.profileCompleted
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {user.profileCompleted ? "Complete" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleProfile(user.id, user.profileCompleted)}
                          disabled={toggleProfileMutation.isPending}
                          className={`px-2 py-1 text-xs rounded ${
                            user.profileCompleted
                              ? "bg-yellow-600 text-white hover:bg-yellow-700"
                              : "bg-green-600 text-white hover:bg-green-700"
                          } disabled:opacity-50`}
                        >
                          {user.profileCompleted ? "Mark Pending" : "Mark Complete"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.name || "Unknown User"
                          )}
                          disabled={deleteUserMutation.isPending}
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-white/60">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

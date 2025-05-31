"use client";

import { useState } from "react";
import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";

// Type definitions with admin fields
type User = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  workEmail?: string | null;
  domain?: string | null;
  departmentId?: string | null;
  profileCompleted: boolean;
  adminLevel?: "USER" | "DEPARTMENT" | "DOMAIN" | "SITE";
  adminScope?: string | null;
  department?: {
    id: string;
    name: string;
    domain: string;
  } | null;
};

// User Statistics Tooltip Component
function UserStatsTooltip({ userId }: { userId: string }) {
  const { data: stats, isLoading } = api.user.getUserStats.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="bg-black/95 text-white p-3 rounded-lg shadow-lg min-w-64">
        <div className="animate-pulse">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-black/95 text-white p-3 rounded-lg shadow-lg min-w-64">
        <div className="text-red-400">Error loading statistics</div>
      </div>
    );
  }

  return (
    <div className="bg-black/95 text-white p-4 rounded-lg shadow-lg min-w-64 max-w-80">
      <h4 className="font-semibold text-blue-400 mb-3">User Statistics</h4>
      
      <div className="space-y-2">
        <div>
          <div className="text-sm font-medium text-gray-300">Assignments</div>
          <div className="text-xs text-gray-400">
            {stats.assignments.total} total • {stats.assignments.purchased} purchased • {stats.assignments.reported} reported
          </div>
        </div>
        
        <div>
          <div className="text-sm font-medium text-gray-300">Own Wishlist</div>
          <div className="text-xs text-gray-400">
            {stats.ownWishlist.assignedTo} assigned • {stats.ownWishlist.purchases} purchased • {stats.ownWishlist.reports} reported
          </div>
        </div>
          
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);  
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

  const updateAdminLevelMutation = api.user.updateAdminLevel.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const deleteUserMutation = api.user.delete.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  // Add state for editing fields
  const [editingDepartmentUserId, setEditingDepartmentUserId] = useState<string | null>(null);
  const [editingAdminUserId, setEditingAdminUserId] = useState<string | null>(null);

  // Helper functions
  const getAdminLevelDisplay = (user: User) => {
    if (!user.adminLevel || user.adminLevel === "USER") {
      return "Regular User";
    }
    
    if (user.adminLevel === "DEPARTMENT") {
      const deptName = user.department?.name || user.adminScope;
      return `Department Admin${deptName ? ` (${deptName})` : ""}`;
    }
    
    if (user.adminLevel === "DOMAIN") {
      return `Domain Admin${user.adminScope ? ` (${user.adminScope})` : ""}`;
    }
    
    return user.adminLevel;
  };

  const handleUpdateAdminLevel = (userId: string, adminLevel: "USER" | "DEPARTMENT" | "DOMAIN", user: User) => {
    let adminScope: string | undefined;
    
    if (adminLevel === "DEPARTMENT") {
      if (!user.departmentId) {
        alert("User must be assigned to a department first");
        return;
      }
      adminScope = user.departmentId;
    } else if (adminLevel === "DOMAIN") {
      if (!user.domain) {
        alert("User must have a domain assigned first");
        return;
      }
      adminScope = user.domain;
    }

    updateAdminLevelMutation.mutate({
      userId,
      adminLevel,
      adminScope,
    });
  };
  // Filter users by selected domain
  const filteredUsers = selectedDomain === "all" 
    ? users 
    : users.filter((user: User) => user.domain === selectedDomain);

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
            <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg p-4 border border-white/20">
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

            <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg p-4 border border-white/20">
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

            <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg p-4 border border-white/20">
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

            <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg p-4 border border-white/20">
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
        <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-4">
            <label htmlFor="domain-filter" className="text-sm font-medium text-white">
              Filter by Domain:
            </label>
            <select
              id="domain-filter"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >              <option value="all">All Domains</option>
              {domains.map((domain: { name: string; enabled: boolean }) => (
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
        <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg border border-white/20">
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-lg font-semibold text-white">Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">              <thead className="bg-white/5">
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
                    Admin Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user: User) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.firstName?.[0] ?? user.name?.[0] ?? "?"}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white relative">
                            <span
                              onMouseEnter={() => setHoveredUserId(user.id)}
                              onMouseLeave={() => setHoveredUserId(null)}
                              className="cursor-pointer hover:text-blue-400"
                            >
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.name || "Unknown User"
                              }
                            </span>
                            {hoveredUserId === user.id && (
                              <div className="absolute z-50 left-0 top-6">
                                <UserStatsTooltip userId={user.id} />
                              </div>
                            )}
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
                    <td className="px-6 py-4">
                      {editingDepartmentUserId === user.id ? (
                        <select
                          value={user.departmentId || ""}
                          onChange={(e) => {
                            handleUpdateDepartment(user.id, e.target.value || null);
                            setEditingDepartmentUserId(null);
                          }}
                          onBlur={() => setEditingDepartmentUserId(null)}
                          autoFocus
                          className="text-sm rounded border border-gray-300 bg-white px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={updateDepartmentMutation.isPending}
                        >
                          <option value="">No Department</option>
                          {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.domain})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className="text-sm text-white cursor-pointer min-h-[28px] break-words whitespace-normal"
                          onDoubleClick={() => setEditingDepartmentUserId(user.id)}
                          title="Double-click to edit department"
                        >
                          {user.department?.name
                            ? `${user.department.name} (${user.department.domain})`
                            : <span className="text-white/40">No Department</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {editingAdminUserId === user.id ? (
                          user.adminLevel === "SITE" ? (
                            <select
                              value="SITE"
                              disabled
                              className="text-sm rounded border border-gray-300 bg-white px-2 py-1 text-gray-500 cursor-not-allowed"
                            >
                              <option value="SITE">Site Admin</option>
                            </select>
                          ) : (
                            <select
                              value={user.adminLevel || "USER"}
                              onChange={(e) => {
                                handleUpdateAdminLevel(
                                  user.id,
                                  e.target.value as "USER" | "DEPARTMENT" | "DOMAIN",
                                  user
                                );
                                setEditingAdminUserId(null);
                              }}
                              onBlur={() => setEditingAdminUserId(null)}
                              autoFocus
                              className="text-sm rounded border border-gray-300 bg-white px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              disabled={updateAdminLevelMutation.isPending}
                            >
                              <option value="USER">Regular User</option>
                              <option value="DEPARTMENT">Department Admin</option>
                              <option value="DOMAIN">Domain Admin</option>
                            </select>
                          )
                        ) : (
                          <div
                            className="text-sm text-white cursor-pointer min-h-[28px] break-words whitespace-normal"
                            onDoubleClick={() => setEditingAdminUserId(user.id)}
                            title="Double-click to edit admin role"
                          >
                            {getAdminLevelDisplay(user)}
                          </div>
                        )}
                        <div className="text-xs text-white/60">
                          {/* Optionally show more info here if needed */}
                        </div>
                      </div>
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

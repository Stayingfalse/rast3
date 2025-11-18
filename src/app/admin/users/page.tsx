"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
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

type Department = {
  id: string;
  name: string;
  domain: string;
};

// User Statistics Tooltip Component
function UserStatsTooltip({ userId }: { userId: string }) {
  const { data: stats, isLoading } = api.user.getUserStats.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="min-w-64 rounded-lg bg-black/95 p-3 text-white shadow-lg">
        <div className="animate-pulse">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-w-64 rounded-lg bg-black/95 p-3 text-white shadow-lg">
        <div className="text-red-400">Error loading statistics</div>
      </div>
    );
  }

  return (
    <div className="max-w-80 min-w-64 rounded-lg bg-black/95 p-4 text-white shadow-lg">
      <h4 className="mb-3 font-semibold text-blue-400">User Statistics</h4>

      <div className="space-y-2">
        <div>
          <div className="text-sm font-medium text-gray-300">Assignments</div>
          <div className="text-xs text-gray-400">
            {stats.assignments.total} total • {stats.assignments.purchased}{" "}
            purchased • {stats.assignments.reported} reported
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-300">Own Wishlist</div>
          <div className="text-xs text-gray-400">
            {stats.ownWishlist.assignedTo} assigned •{" "}
            {stats.ownWishlist.purchases} purchased •{" "}
            {stats.ownWishlist.reports} reported
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"none" | "department" | "status" | "role">("none");
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  // Get current user's profile to check admin level
  const { data: currentUser } = api.profile.getCurrentProfile.useQuery();

  const { data: users = [], refetch } = api.user.getAll.useQuery();
  const { data: stats } = api.user.getStats.useQuery();
  const { data: domains = [] } = api.domain.getAll.useQuery();
  const { data: departments = [] } =
    api.profile.getDepartmentsByDomain.useQuery({ domain: "all" });

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
  const [editingDepartmentUserId, setEditingDepartmentUserId] = useState<
    string | null
  >(null);
  const [editingAdminUserId, setEditingAdminUserId] = useState<string | null>(
    null,
  );

  // Helper functions
  const getAdminLevelDisplay = (user: User) => {
    if (!user.adminLevel || user.adminLevel === "USER") {
      return "Regular User";
    }

    if (user.adminLevel === "DEPARTMENT") {
      const deptName = user.department?.name ?? user.adminScope;
      return `Department Admin${deptName ? ` (${deptName})` : ""}`;
    }

    if (user.adminLevel === "DOMAIN") {
      return `Domain Admin${user.adminScope ? ` (${user.adminScope})` : ""}`;
    }

    return user.adminLevel;
  };

  const handleUpdateAdminLevel = (
    userId: string,
    adminLevel: "USER" | "DEPARTMENT" | "DOMAIN",
    user: User,
  ) => {
    let adminScope: string | undefined;

    if (adminLevel === "DEPARTMENT") {
      if (!user.departmentId) {
        toast.error("User must be assigned to a department first");
        return;
      }
      adminScope = user.departmentId;
    } else if (adminLevel === "DOMAIN") {
      if (!user.domain) {
        toast.error("User must have a domain assigned first");
        return;
      }
      adminScope = user.domain;
    }

    updateAdminLevelMutation.mutate({
      userId,
      adminLevel,
      adminScope,
    });
  }; // end updateAdminLevel

  // Client-side filtering
  const filteredUsers = users
    .filter((user) => (selectedDomain === "all" ? true : user.domain === selectedDomain))
    .filter((user) => (selectedDepartment === "all" ? true : user.departmentId === selectedDepartment))
    .filter((user) => {
      if (selectedStatus === "all") return true;
      if (selectedStatus === "complete") return user.profileCompleted === true;
      if (selectedStatus === "pending") return user.profileCompleted === false;
      return true;
    })
    .filter((user) => (selectedRole === "all" ? true : (user.adminLevel ?? "USER") === selectedRole));

  // Grouping helper (only used if groupBy !== 'none')
  const groupedUsers: Record<string, User[]> = {};
  if (groupBy === "department") {
    for (const u of filteredUsers) {
      const key = u.department?.name ?? "No Department";
      (groupedUsers[key] ??= []).push(u);
    }
  } else if (groupBy === "status") {
    for (const u of filteredUsers) {
      const key = u.profileCompleted ? "Complete" : "Pending";
      (groupedUsers[key] ??= []).push(u);
    }
  } else if (groupBy === "role") {
    for (const u of filteredUsers) {
      const key = u.adminLevel ?? "USER";
      (groupedUsers[key] ??= []).push(u);
    }
  }

  const handleToggleProfile = (userId: string, currentStatus: boolean) => {
    toggleProfileMutation.mutate({
      userId,
      completed: !currentStatus,
    });
  };

  const handleUpdateDepartment = (
    userId: string,
    departmentId: string | null,
  ) => {
    updateDepartmentMutation.mutate({
      userId,
      departmentId,
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    // Using toast with a custom confirmation
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span>Are you sure you want to delete user &quot;{userName}&quot;? This action cannot be undone.</span>
        <div className="flex gap-2">
          <button
            className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
            onClick={() => {
              toast.dismiss(t.id);
              deleteUserMutation.mutate({ userId });
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
  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm sm:text-base text-white/80">Manage user profiles and permissions</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">            <div className="rounded-lg border border-white/20 bg-black/85 p-3 sm:p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-white/80">
                    Total Users
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-white">
                    {stats.totalUsers}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-black/85 p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">
                    Completed Profiles
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {stats.completedProfiles}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-black/85 p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">
                    Pending Profiles
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {stats.pendingProfiles}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-black/85 p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 21h19.5m-18-18v18m2.25-18h15.75m-15.75 0V9.75m0 11.25h15.75M7.5 6.75h.75m.75 0h.75m.75 0h.75m0 0V18m-7.5 0V6.75"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white/80">Domains</p>
                  <p className="text-lg font-semibold text-white">
                    {domains.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}        {/* Domain Filter */}
        <div className="rounded-lg border border-white/20 bg-black/85 p-3 sm:p-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label
              htmlFor="domain-filter"
              className="text-sm font-medium text-white"
            >
              Filter by Domain:
            </label>
            <select
              id="domain-filter"
              aria-label="Filter by domain"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Domains</option>
              {domains.map((domain: { name: string; enabled: boolean }) => (
                <option key={domain.name} value={domain.name}>
                  {domain.name} ({domain.enabled ? "Enabled" : "Disabled"})
                </option>
              ))}
            </select>
            <label htmlFor="department-filter" className="sr-only">Filter by department</label>
            <select
              id="department-filter"
              aria-label="Filter by department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name} ({d.domain})</option>
              ))}
            </select>

            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="complete">Complete</option>
              <option value="pending">Pending</option>
            </select>

            <label htmlFor="role-filter" className="sr-only">Filter by role</label>
            <select
              id="role-filter"
              aria-label="Filter by role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="USER">Regular User</option>
              <option value="DEPARTMENT">Department Admin</option>
              <option value="DOMAIN">Domain Admin</option>
              <option value="SITE">Site Admin</option>
            </select>

            <label htmlFor="group-by" className="sr-only">Group users by</label>
            <select
              id="group-by"
              aria-label="Group users by"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "none" | "department" | "status" | "role")}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="none">No Grouping</option>
              <option value="department">Group by Department</option>
              <option value="status">Group by Status</option>
              <option value="role">Group by Role</option>
            </select>

            <span className="text-xs sm:text-sm text-white/60">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </div>        {/* Users Table/Cards */}
        <div className="rounded-lg border border-white/20 bg-black/85 backdrop-blur-sm">
          <div className="border-b border-white/20 px-4 sm:px-6 py-3 sm:py-4">
            <h2 className="text-base sm:text-lg font-semibold text-white">Users</h2>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              {" "}
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Email & Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Admin Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>{" "}
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-purple-500 text-sm font-medium text-white">
                          {user.firstName?.[0] ?? user.name?.[0] ?? "?"}
                        </div>
                        <div className="ml-3">
                          <div className="relative text-sm font-medium text-white">
                            <span
                              onMouseEnter={() => setHoveredUserId(user.id)}
                              onMouseLeave={() => setHoveredUserId(null)}
                              className="cursor-pointer hover:text-blue-400"
                            >
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : (user.name ?? "Unknown User")}
                            </span>
                            {hoveredUserId === user.id && (
                              <div className="absolute top-6 left-0 z-50">
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
                        {user.workEmail ?? user.email ?? "No email"}
                      </div>
                      <div className="text-sm text-white/60">
                        {user.domain ?? "No domain"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        {editingDepartmentUserId === user.id ? (
                        <select
                          value={user.departmentId ?? ""}
                          title="Select department"
                          onChange={(e) => {
                            handleUpdateDepartment(
                              user.id,
                              e.target.value ?? null,
                            );
                            setEditingDepartmentUserId(null);
                          }}
                          onBlur={() => setEditingDepartmentUserId(null)}
                          autoFocus
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          disabled={updateDepartmentMutation.isPending}
                        >
                          <option value="">No Department</option>{" "}
                          {departments.map((dept: Department) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.domain})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className="min-h-[28px] cursor-pointer text-sm break-words whitespace-normal text-white"
                          onDoubleClick={() =>
                            setEditingDepartmentUserId(user.id)
                          }
                          title="Double-click to edit department"
                        >
                          {user.department?.name ? (
                            `${user.department.name} (${user.department.domain})`
                          ) : (
                            <span className="text-white/40">No Department</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {editingAdminUserId === user.id ? (
                          user.adminLevel === "SITE" ? (
                            <select
                              value="SITE"
                              title="Site admin"
                              disabled
                              className="cursor-not-allowed rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-500"
                            >
                              <option value="SITE">Site Admin</option>
                            </select>
                          ) : (
                            <select
                              value={user.adminLevel ?? "USER"}
                              title="Select admin role"
                              onChange={(e) => {
                                handleUpdateAdminLevel(
                                  user.id,
                                  e.target.value as
                                    | "USER"
                                    | "DEPARTMENT"
                                    | "DOMAIN",
                                  user,
                                );
                                setEditingAdminUserId(null);
                              }}
                              onBlur={() => setEditingAdminUserId(null)}
                              autoFocus
                              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              disabled={updateAdminLevelMutation.isPending}
                            >
                              <option value="USER">Regular User</option>
                              <option value="DEPARTMENT">
                                Department Admin
                              </option>
                              {/* DOMAIN option only available to SITE and DOMAIN admins */}
                              {(currentUser?.adminLevel === "SITE" ||
                                currentUser?.adminLevel === "DOMAIN") && (
                                <option value="DOMAIN">Domain Admin</option>
                              )}
                            </select>
                          )
                        ) : (
                          <div
                            className="min-h-[28px] cursor-pointer text-sm break-words whitespace-normal text-white"
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
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          user.profileCompleted
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {user.profileCompleted ? "Complete" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleToggleProfile(user.id, user.profileCompleted)
                          }
                          disabled={toggleProfileMutation.isPending}
                          className={`rounded px-2 py-1 text-xs ${
                            user.profileCompleted
                              ? "bg-yellow-600 text-white hover:bg-yellow-700"
                              : "bg-green-600 text-white hover:bg-green-700"
                          } disabled:opacity-50`}
                        >
                          {user.profileCompleted
                            ? "Mark Pending"
                            : "Mark Complete"}
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteUser(
                              user.id,
                              user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : (user.name ?? "Unknown User"),
                            )
                          }
                          disabled={deleteUserMutation.isPending}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>            {filteredUsers.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-white/60">No users found</p>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden p-4 space-y-4">
            {filteredUsers.map((user: User) => (
              <div key={user.id} className="bg-white/5 rounded-lg p-4">
                {/* User Header */}
                <div className="flex items-center mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-purple-500 text-sm font-medium text-white">
                    {user.firstName?.[0] ?? user.name?.[0] ?? "?"}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-white">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : (user.name ?? "Unknown User")}
                    </div>
                    <div className="text-xs text-white/60">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      user.profileCompleted
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {user.profileCompleted ? "Complete" : "Pending"}
                  </span>
                </div>

                {/* User Details */}
                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-xs text-white/60 uppercase tracking-wide">Email & Domain</span>
                    <div className="text-sm text-white">{user.workEmail ?? user.email ?? "No email"}</div>
                    <div className="text-xs text-white/60">{user.domain ?? "No domain"}</div>
                  </div>

                  <div>
                    <span className="text-xs text-white/60 uppercase tracking-wide">Department</span>
                    <div className="text-sm text-white">
                      {user.department?.name ? (
                        `${user.department.name} (${user.department.domain})`
                      ) : (
                        <span className="text-white/40">No Department</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-white/60 uppercase tracking-wide">Admin Role</span>
                    <div className="text-sm text-white">{getAdminLevelDisplay(user)}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleToggleProfile(user.id, user.profileCompleted)
                    }
                    disabled={toggleProfileMutation.isPending}
                    className={`flex-1 rounded px-3 py-2 text-xs ${
                      user.profileCompleted
                        ? "bg-yellow-600 text-white hover:bg-yellow-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } disabled:opacity-50`}
                  >
                    {user.profileCompleted ? "Mark Pending" : "Mark Complete"}
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteUser(
                        user.id,
                        user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : (user.name ?? "Unknown User"),
                      )
                    }
                    disabled={deleteUserMutation.isPending}
                    className="flex-1 rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-white/60">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

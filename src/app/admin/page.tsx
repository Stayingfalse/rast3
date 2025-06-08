"use client";

import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";

type DomainData = {
  id: string;
  name: string;
  enabled: boolean;
  description?: string | null;
};

export default function AdminPage() {
  return (
    <AdminLayout>
      <AdminOverview />
    </AdminLayout>
  );
}

function AdminOverview() {
  // Get all departments and domains for overview
  const { data: departments } = api.profile.getDepartmentsByDomain.useQuery({
    domain: "all",
  });

  const { data: domains } = api.domain.getAll.useQuery();
  const { data: userStats } = api.user.getStats.useQuery();
  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Overview</h1>
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-6">
          <h3 className="text-sm font-medium text-white/80">Total Domains</h3>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {domains?.length ?? 0}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {domains?.filter((d: DomainData) => d.enabled).length ?? 0} enabled
          </p>
        </div>

        <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-6">
          <h3 className="text-sm font-medium text-white/80">
            Total Departments
          </h3>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {departments?.length ?? 0}
          </p>
        </div>

        <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-6">
          <h3 className="text-sm font-medium text-white/80">Total Users</h3>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {userStats?.totalUsers ?? 0}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {userStats?.completedProfiles ?? 0} profiles completed
          </p>
        </div>

        <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-6">
          <h3 className="text-sm font-medium text-white/80">
            Pending Profiles
          </h3>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {userStats?.pendingProfiles ?? 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 sm:mb-8">
        <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <a
            href="/admin/domains"
            className="rounded-lg bg-purple-600/80 p-4 text-white transition-colors hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
          >
            <h3 className="font-medium">Manage Domains</h3>
            <p className="mt-1 text-sm text-purple-100">
              Add, edit, or enable/disable company domains
            </p>
          </a>          <a
            href="/admin/departments"
            className="rounded-lg bg-blue-600/80 p-4 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
          >
            <h3 className="font-medium">Manage Departments</h3>
            <p className="mt-1 text-sm text-blue-100">
              Organize departments within domains
            </p>
          </a>

          <a
            href="/admin/users"
            className="rounded-lg bg-green-600/80 p-4 text-white transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
          >
            <h3 className="font-medium">View Users</h3>
            <p className="mt-1 text-sm text-green-100">
              Monitor user profiles and activity
            </p>
          </a>
        </div>
      </div>

      {/* Recent Activity or Alerts */}
      <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80 sm:text-base">Database Connection</span>
            <span className="rounded-full bg-green-600 px-2 py-1 text-xs text-white">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80 sm:text-base">Profile System</span>
            <span className="rounded-full bg-green-600 px-2 py-1 text-xs text-white">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80 sm:text-base">Authentication</span>
            <span className="rounded-full bg-green-600 px-2 py-1 text-xs text-white">
              Working
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

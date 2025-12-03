"use client";

import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

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
  const { data: domainDeptStats } = api.admin.getDomainDepartmentStats.useQuery({});
  type DepartmentStat = {
    departmentId: string | null;
    departmentName: string | null;
    users: number;
    links: number;
    errors: number;
    purchases: number;
    kudos: number;
  };

  type DomainStat = {
    domain: string;
    departments: DepartmentStat[];
  };

  const stats = domainDeptStats as DomainStat[] | undefined;

  const copyDomainCsv = async (domainStat: DomainStat) => {
    try {
      const escape = (v: string | number | boolean | null | undefined) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };

      const headers = ["Domain", "Department", "Users", "Links", "Errors", "Purchases", "Kudos"];
      const rows = domainStat.departments.map((d) => [
        domainStat.domain,
        d.departmentName ?? "(no department)",
        String(d.users ?? 0),
        String(d.links ?? 0),
        String(d.errors ?? 0),
        String(d.purchases ?? 0),
        String(d.kudos ?? 0),
      ]);

      const csvLines = [headers.map(escape).join(",")].concat(rows.map((r) => r.map(escape).join(",")));
      const output = csvLines.join("\n");
      await navigator.clipboard.writeText(output);
      toast.success("Copied domain stats to clipboard");
    } catch {
      // fallback: notify failure
      toast.error("Could not copy stats to clipboard");
    }
  };
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

      {/* Domain / Department Key Stats (table view) */}
      <div className="rounded-lg bg-black/85 p-4 backdrop-blur-sm sm:p-">
        <h2 className="text-sm text-white/80 sm:text-base">Key Stats by Domain & Department</h2>
        {(!stats || stats.length === 0) && <p className="text-sm text-white/80 sm:text-base">No data available</p>}

        {stats && stats.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Domain / Department</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Users</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Links</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Errors</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Purchases</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Kudos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((domain) => (
                  <>
                    <tr key={`domain-${domain.domain}`} className="bg-black/85">
                      <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-white">
                        <div className="flex items-center justify-between">
                          <span>{domain.domain}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void copyDomainCsv(domain)}
                              className="ml-4 inline-flex items-center gap-2 rounded border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
                              aria-label={`Copy stats for ${domain.domain}`}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Totals row for domain */}
                    {(() => {
                      const totals = domain.departments.reduce(
                        (acc, d) => {
                          acc.users += d.users ?? 0;
                          acc.links += d.links ?? 0;
                          acc.errors += d.errors ?? 0;
                          acc.purchases += d.purchases ?? 0;
                          acc.kudos += d.kudos ?? 0;
                          return acc;
                        },
                        { users: 0, links: 0, errors: 0, purchases: 0, kudos: 0 },
                      );
                      return (
                        <tr key={`domain-totals-${domain.domain}`} className="bg-black/70">
                          <td className="px-4 py-2 text-sm font-medium text-white">Totals</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-white">{totals.users}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-white">{totals.links}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-white">{totals.errors}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-white">{totals.purchases}</td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-white">{totals.kudos}</td>
                        </tr>
                      );
                    })()}

                    {domain.departments.map((dept: DepartmentStat) => (
                      <tr key={dept.departmentId ?? dept.departmentName}>
                        <td className="px-4 py-2 text-sm text-gray-700">{dept.departmentName ?? "(no department)"}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">{dept.users}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">{dept.links}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">{dept.errors}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">{dept.purchases}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">{dept.kudos}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

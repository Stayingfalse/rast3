"use client";

import { useState, useMemo } from "react";
import { AdminLayout } from "../../_components/admin-layout";
import { api } from "../../../trpc/react";

// Define types based on what's returned from the API
type UserWithWishlist = {
  id: string;
  name?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  amazonWishlistUrl?: string | null;
  domain?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  amazonWishlistUrlStats?: {
    allocated?: number;
    purchased?: number;
    errors?: string[];
  };
};

type DomainData = {
  id: string;
  name: string;
  enabled: boolean;
  description?: string | null;
};

type GroupedUsers = Record<string, Record<string, UserWithWishlist[]>>;

export default function AdminLinksPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("all"); // Fetch all users with wishlist URLs
  const { data: users = [], isLoading, isError } = api.link.getAll.useQuery();
  const { data: domains = [], isLoading: isDomainsLoading } =
    api.domain.getAll.useQuery();

  // Filter users with wishlist URLs
  const wishlists = useMemo(() => {
    return users.filter((u: UserWithWishlist) => u.amazonWishlistUrl);
  }, [users]);

  // Stats
  const stats = useMemo(() => {
    const filtered =
      selectedDomain === "all"
        ? wishlists
        : wishlists.filter(
            (u: UserWithWishlist) => u.domain === selectedDomain,
          );
    return {
      total: filtered.length,
      domains: Array.from(
        new Set(wishlists.map((u: UserWithWishlist) => u.domain)),
      ).length,
      departments: Array.from(
        new Set(filtered.map((u: UserWithWishlist) => u.department?.name)),
      ).length,
    };
  }, [wishlists, selectedDomain]);

  // Group by domain and department
  const grouped: GroupedUsers = useMemo(() => {
    const filtered =
      selectedDomain === "all"
        ? wishlists
        : wishlists.filter(
            (u: UserWithWishlist) => u.domain === selectedDomain,
          );
    const result: GroupedUsers = {};
    for (const user of filtered) {
      const domain = user.domain ?? "(No Domain)";
      const dept = user.department?.name ?? "(No Department)";
      result[domain] ??= {};
      result[domain][dept] ??= [];
      result[domain][dept].push(user);
    }
    return result;
  }, [wishlists, selectedDomain]);

  // Helper: Truncate URL
  function truncateUrl(url: string, max = 40) {
    return url.length > max ? url.slice(0, max) + "..." : url;
  }
  // Row component for each user
  function WishlistRow({ user }: { user: UserWithWishlist }) {
    const stats = user.amazonWishlistUrlStats ?? {};
    const errorCount = stats.errors?.length ?? 0;
    const [showErrors, setShowErrors] = useState(false);
    return (
      <tr key={user.id} className="hover:bg-white/5">
        <td className="px-6 py-4 font-medium text-white">
          {user.firstName ?? user.name ?? user.email ?? user.id}
        </td>{" "}
        <td className="px-6 py-4">
          {user.amazonWishlistUrl ? (
            <a
              href={user.amazonWishlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-300 underline"
            >
              {truncateUrl(user.amazonWishlistUrl)}
            </a>
          ) : (
            <span className="text-gray-400">No URL</span>
          )}
        </td>
        <td className="px-6 py-4 text-center text-white">
          {stats.allocated ?? 1}
        </td>
        <td className="px-6 py-4 text-center text-white">
          {stats.purchased ?? 0}
        </td>
        <td className="px-6 py-4 text-center">
          {errorCount === 0 ? (
            <span title="No errors">
              <svg
                className="inline h-5 w-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
          ) : (
            <span className="inline-block align-middle">
              <button
                type="button"
                onClick={() => setShowErrors((v) => !v)}
                className="focus:outline-none"
                title="Show errors"
              >
                <svg
                  className="inline h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              {showErrors && (
                <div className="z-10 mt-2 rounded bg-red-900/90 p-2 text-xs text-red-100 shadow-lg">
                  <ul className="list-disc pl-4">
                    {stats.errors?.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Wishlist Management</h1>
          <p className="mb-4 text-white/80">
            Manage and monitor all shared Amazon wishlists. Grouped by domain
            and department.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/20 bg-black/85 p-4 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white/80">
                  Total Wishlists
                </p>
                <p className="text-lg font-semibold text-white">
                  {stats.total}
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
                    d="M2.25 21h19.5M12 4.5v15"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white/80">Domains</p>
                <p className="text-lg font-semibold text-white">
                  {stats.domains}
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
                    d="M9 12.75L11.25 15 15 9.75"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white/80">Departments</p>
                <p className="text-lg font-semibold text-white">
                  {stats.departments}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Filter */}
        <div className="rounded-lg border border-white/20 bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <label
              htmlFor="domain-filter"
              className="text-sm font-medium text-white"
            >
              Filter by Domain:
            </label>{" "}
            <select
              id="domain-filter"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              disabled={isDomainsLoading}
            >
              <option value="all">All Domains</option>
              {domains.map((domain: DomainData) => (
                <option key={domain.name} value={domain.name}>
                  {domain.name} {domain.enabled === false ? "(Disabled)" : ""}
                </option>
              ))}
            </select>
            <span className="text-sm text-white/60">
              Showing {stats.total} wishlists
            </span>
          </div>
        </div>
        {/* Loading/Error States */}
        {(isLoading ?? isDomainsLoading) ? (
          <div className="py-8 text-center text-white/80">
            Loading wishlists...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-red-400">
            Error loading wishlists
          </div>
        ) : stats.total === 0 ? (
          <div className="py-8 text-center text-white/60">
            No wishlists found.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([domain, depts]) => (
              <div key={domain}>
                <h2 className="mb-2 text-xl font-semibold text-blue-300">
                  {domain}
                </h2>
                {Object.entries(depts).map(([dept, users]) => (
                  <div key={dept} className="mb-6">
                    <h3 className="mb-1 text-lg font-medium text-white/80">
                      {dept}
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-white/20 bg-black/85 backdrop-blur-sm">
                      <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                              Wishlist URL
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                              Allocated
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                              Purchased
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-white/80 uppercase">
                              Errors
                            </th>
                          </tr>
                        </thead>{" "}
                        <tbody className="divide-y divide-white/10">
                          {users.map((user: UserWithWishlist) => (
                            <WishlistRow key={user.id} user={user} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

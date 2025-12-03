"use client";

import { useMemo, useState } from "react";
import { api } from "../../../trpc/react";
import { AdminLayout } from "../../_components/admin-layout";

// Define types based on what's returned from the API
type UserWithWishlist = {
  id: string;
  name?: string | null;
  email?: string | null;
  workEmail?: string | null;
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
  const [onlyReported, setOnlyReported] = useState<boolean>(false);
  const { data: users = [], isLoading, isError } = api.link.getAll.useQuery();
  const { data: domains = [], isLoading: isDomainsLoading } =
    api.domain.getAll.useQuery();

  // Filter users with wishlist URLs
  const wishlists = useMemo(() => {
    return users.filter((u: UserWithWishlist) => u.amazonWishlistUrl);
  }, [users]);

  // Stats
  const stats = useMemo(() => {
    let filtered =
      selectedDomain === "all"
        ? wishlists
        : wishlists.filter((u: UserWithWishlist) => u.domain === selectedDomain);
    if (onlyReported) {
      filtered = filtered.filter(
        (u: UserWithWishlist) => (u.amazonWishlistUrlStats?.errors?.length ?? 0) > 0,
      );
    }
    return {
      total: filtered.length,
      domains: Array.from(
        new Set(filtered.map((u: UserWithWishlist) => u.domain)),
      ).length,
      departments: Array.from(
        new Set(filtered.map((u: UserWithWishlist) => u.department?.name)),
      ).length,
    };
  }, [wishlists, selectedDomain, onlyReported]);

  // Group by domain and department
  const grouped: GroupedUsers = useMemo(() => {
    let filtered =
      selectedDomain === "all"
        ? wishlists
        : wishlists.filter((u: UserWithWishlist) => u.domain === selectedDomain);
    if (onlyReported) {
      filtered = filtered.filter(
        (u: UserWithWishlist) => (u.amazonWishlistUrlStats?.errors?.length ?? 0) > 0,
      );
    }
    const result: GroupedUsers = {};
    for (const user of filtered) {
      const domain = user.domain ?? "(No Domain)";
      const dept = user.department?.name ?? "(No Department)";
      result[domain] ??= {};
      result[domain][dept] ??= [];
      result[domain][dept].push(user);
    }
    return result;
  }, [wishlists, selectedDomain, onlyReported]);

  // Helper: Truncate URL
  function truncateUrl(url: string, max = 40) {
    return url.length > max ? url.slice(0, max) + "..." : url;
  }
  // Row component for each user
  function WishlistRow({ user }: { user: UserWithWishlist }) {
    const stats = user.amazonWishlistUrlStats ?? {};
    const errors = Array.isArray(stats.errors) ? stats.errors.filter(e => !!e) : [];
    const errorCount = errors.length;
    const [showErrors, setShowErrors] = useState(false);
    const ownerEmail = user.workEmail ?? user.email ?? "";
    const displayName = user.firstName
      ? user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName
      : user.name ?? user.email ?? user.id;
    const mailSubject = `Action required: ${errorCount} reported issue${errorCount !== 1 ? "s" : ""} on your shared wishlist`;
    const urlPart = user.amazonWishlistUrl ? ":\n" + user.amazonWishlistUrl : ".";
    const mailBody =
      `Hi ${user.firstName ?? user.name ?? "there"},\n\n` +
      `Our system has detected ${errorCount} reported issue${errorCount !== 1 ? "s" : ""} with your shared Amazon wishlist${urlPart}\n\n` +
      `Please review the wishlist and update or remove any unavailable items so the reported issues can be resolved. If you need help, reply to this message or contact the site admin team.\n\n` +
      `Thanks,\nSite Admin Team`;
    const mailtoHref = ownerEmail
      ? `mailto:${ownerEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`
      : null;
    return (
      <tr key={user.id} className="hover:bg-white/5">
        <td className="px-6 py-4 font-medium text-white">
          {displayName}
        </td>
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
                className="focus:outline-none inline-flex items-center gap-2"
                title={`Show ${errorCount} reported error${errorCount > 1 ? "s" : ""}`}
                aria-label={`Show ${errorCount} reported error${errorCount > 1 ? "s" : ""}`}
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
                <span className="ml-0 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  {errorCount}
                </span>
              </button>
              {showErrors && errorCount > 0 && (
                <div className="z-10 mt-2 rounded bg-red-900/90 p-2 text-xs text-red-100 shadow-lg">
                  <ul className="list-disc pl-4">
                    {errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center gap-3">
                    {mailtoHref ? (
                      <a
                        href={mailtoHref}
                        className="inline-flex items-center rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        title={`Email ${ownerEmail} about ${errorCount} reported issue${errorCount !== 1 ? "s" : ""}`}
                        aria-label={`Email owner about ${errorCount} reported issue${errorCount !== 1 ? "s" : ""}`}
                      >
                        Email owner
                      </a>
                    ) : (
                      <span className="text-xs text-white/60">No email available</span>
                    )}
                  </div>
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
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Wishlist Management</h1>
          <p className="mb-3 sm:mb-4 text-sm sm:text-base text-white/80">
            Manage and monitor all shared Amazon wishlists. Grouped by domain
            and department.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>        {/* Domain Filter */}
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
            <label className="inline-flex items-center gap-2">
              <input
                id="reported-only"
                type="checkbox"
                checked={onlyReported}
                onChange={(e) => setOnlyReported(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-white/80">Only show with reports</span>
            </label>
            <span className="text-xs sm:text-sm text-white/60">
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
          </div>        ) : (
          <div className="space-y-6 sm:space-y-8">
            {Object.entries(grouped).map(([domain, depts]) => (
              <div key={domain}>
                <h2 className="mb-3 sm:mb-2 text-lg sm:text-xl font-semibold text-blue-300">
                  {domain}
                </h2>
                {Object.entries(depts).map(([dept, users]) => (
                  <div key={dept} className="mb-4 sm:mb-6">
                    <h3 className="mb-2 sm:mb-1 text-base sm:text-lg font-medium text-white/80">
                      {dept}
                    </h3>
                    
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto rounded-lg border border-white/20 bg-black/85 backdrop-blur-sm">
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
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {users.map((user: UserWithWishlist) => (
                            <WishlistRow key={user.id} user={user} />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                      {users.map((user: UserWithWishlist) => {
                        const stats = user.amazonWishlistUrlStats ?? {};
                        const errorCount = stats.errors?.length ?? 0;
                        const displayName = user.firstName
                          ? user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName
                          : user.name ?? user.email ?? user.id;
                        return (
                          <div key={user.id} className="bg-black/85 rounded-lg border border-white/20 p-4 backdrop-blur-sm">
                            <div className="mb-3">
                              <h4 className="font-medium text-white text-lg">
                                {displayName}
                              </h4>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <div>
                                <span className="text-xs text-white/60 uppercase tracking-wide">Wishlist URL</span>
                                <div className="text-sm">
                                  {user.amazonWishlistUrl ? (
                                    <a
                                      href={user.amazonWishlistUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="break-all text-blue-300 underline"
                                    >
                                      {truncateUrl(user.amazonWishlistUrl, 50)}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">No URL</span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-xs text-white/60 uppercase tracking-wide">Allocated</span>
                                  <div className="text-sm text-white">{stats.allocated ?? 1}</div>
                                </div>
                                <div>
                                  <span className="text-xs text-white/60 uppercase tracking-wide">Purchased</span>
                                  <div className="text-sm text-white">{stats.purchased ?? 0}</div>
                                </div>
                              </div>

                              <div>
                                <span className="text-xs text-white/60 uppercase tracking-wide">Status</span>
                                <div className="text-sm">
                                  {errorCount === 0 ? (
                                    <span className="flex items-center text-green-400">
                                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      No errors
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="flex items-center text-red-400 mb-2">
                                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        {errorCount} error{errorCount > 1 ? 's' : ''}
                                      </span>
                                      {stats.errors && stats.errors.length > 0 && (
                                        <div className="bg-red-900/50 rounded p-2 text-xs text-red-200">
                                          <ul className="list-disc pl-4">
                                            {stats.errors.map((err: string, i: number) => (
                                              <li key={i}>{err}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

"use client";

import { useState, useMemo } from "react";
import { AdminLayout } from "../../_components/admin-layout";
import { api } from "../../../trpc/react";

export default function AdminLinksPage() {
	const [selectedDomain, setSelectedDomain] = useState<string>("all");

	// Fetch all users with wishlist URLs
	const { data: users = [], isLoading, isError, error } = api.link.getAll.useQuery();
	const { data: domains = [], isLoading: isDomainsLoading } = api.domain.getAll.useQuery();

	// Filter users with wishlist URLs
	const wishlists = useMemo(() => {
		return users.filter((u: any) => u.amazonWishlistUrl);
	}, [users]);

	// Stats
	const stats = useMemo(() => {
		const filtered = selectedDomain === "all"
			? wishlists
			: wishlists.filter((u: any) => u.domain === selectedDomain);
		return {
			total: filtered.length,
			domains: Array.from(new Set(wishlists.map((u: any) => u.domain))).length,
			departments: Array.from(new Set(filtered.map((u: any) => u.department?.name))).length,
		};
	}, [wishlists, selectedDomain]);

	// Group by domain and department
	const grouped = useMemo(() => {
		const filtered = selectedDomain === "all"
			? wishlists
			: wishlists.filter((u: any) => u.domain === selectedDomain);
		const result: Record<string, Record<string, any[]>> = {};
		for (const user of filtered) {
			const domain = user.domain || "(No Domain)";
			const dept = user.department?.name || "(No Department)";
			if (!result[domain]) result[domain] = {};
			if (!result[domain][dept]) result[domain][dept] = [];
			result[domain][dept].push(user);
		}
		return result;
	}, [wishlists, selectedDomain]);

	// Helper: Truncate URL
	function truncateUrl(url: string, max = 40) {
		return url.length > max ? url.slice(0, max) + "..." : url;
	}

	// Row component for each user
	function WishlistRow({ user }: { user: any }) {
		const stats = user.amazonWishlistUrlStats || {};
		const errorCount = stats.errors?.length || 0;
		const [showErrors, setShowErrors] = useState(false);
		return (
			<tr key={user.id} className="hover:bg-white/5">
				<td className="px-6 py-4 text-white font-medium">
					{user.firstName || user.name || user.email || user.id}
				</td>
				<td className="px-6 py-4">
					<a
						href={user.amazonWishlistUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-300 underline break-all"
					>
						{truncateUrl(user.amazonWishlistUrl)}
					</a>
				</td>
				<td className="px-6 py-4 text-white text-center">
					{stats.allocated ?? 1}
				</td>
				<td className="px-6 py-4 text-white text-center">
					{stats.purchased ?? 0}
				</td>
				<td className="px-6 py-4 text-center">
					{errorCount === 0 ? (
						<span title="No errors">
							<svg className="inline h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
								<svg className="inline h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
							{showErrors && (
								<div className="mt-2 bg-red-900/90 text-red-100 rounded p-2 text-xs shadow-lg z-10">
									<ul className="list-disc pl-4">
										{stats.errors.map((err: string, i: number) => (
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
					<p className="text-white/80 mb-4">
						Manage and monitor all shared Amazon wishlists. Grouped by domain and department.
					</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="bg-white/10 rounded-lg p-4 border border-white/20">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-white/80">Total Wishlists</p>
								<p className="text-lg font-semibold text-white">{stats.total}</p>
							</div>
						</div>
					</div>
					<div className="bg-white/10 rounded-lg p-4 border border-white/20">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M12 4.5v15" />
								</svg>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-white/80">Domains</p>
								<p className="text-lg font-semibold text-white">{stats.domains}</p>
							</div>
						</div>
					</div>
					<div className="bg-white/10 rounded-lg p-4 border border-white/20">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
								</svg>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-white/80">Departments</p>
								<p className="text-lg font-semibold text-white">{stats.departments}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Domain Filter */}
				<div className="bg-white/10 rounded-lg p-4 border border-white/20">
					<div className="flex items-center gap-4">
						<label htmlFor="domain-filter" className="text-sm font-medium text-white">
							Filter by Domain:
						</label>
						<select
							id="domain-filter"
							value={selectedDomain}
							onChange={e => setSelectedDomain(e.target.value)}
							className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							disabled={isDomainsLoading}
						>
							<option value="all">All Domains</option>
							{domains.map((domain: any) => (
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
                {isLoading || isDomainsLoading ? (
                    <div className="text-white/80 text-center py-8">Loading wishlists...</div>
                ) : isError ? (
                    <div className="text-red-400 text-center py-8">Error loading wishlists: {error?.message}</div>
                ) : stats.total === 0 ? (
                    <div className="text-white/60 text-center py-8">No wishlists found.</div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(grouped).map(([domain, depts]) => (
                            <div key={domain}>
                                <h2 className="text-xl font-semibold text-blue-300 mb-2">{domain}</h2>
                                {Object.entries(depts).map(([dept, users]) => (
                                    <div key={dept} className="mb-6">
                                        <h3 className="text-lg font-medium text-white/80 mb-1">{dept}</h3>
                                        <div className="bg-white/10 rounded-lg border border-white/20 overflow-x-auto">
                                            <table className="min-w-full divide-y divide-white/10">
                                                <thead className="bg-white/5">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">User</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Wishlist URL</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Allocated</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Purchased</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">Errors</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/10">
                                                    {users.map((user: any) => (
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

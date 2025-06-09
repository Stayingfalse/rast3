// Admin Kudos Management Page
// 1. Imports
import { api } from "@/trpc/react";
import { useState } from "react";
import { AdminLayout } from "~/app/_components/admin-layout";
import { loggers } from "~/utils/logger";

// 2. Type definitions
interface AdminKudosItem {
  id: string;
  message: string;
  images: string[];
  createdAt: string;
  hidden: boolean;
  user: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
    department?: { name: string } | null;
  };
}

// 3. Custom hooks and utilities
function useAdminKudosFeed(scope: "department" | "domain" | "site") {
  const { data, isLoading, error, refetch } = api.kudos.getFeed.useQuery({
    scope,
    limit: 30,
  });
  return { data, isLoading, error, refetch };
}

// 4. Main component function
export default function AdminKudosPage() {
  const [scope, setScope] = useState<"department" | "domain" | "site">("site");
  const { data, isLoading, error, refetch } = useAdminKudosFeed(scope);

  // Logging page view
  loggers.admin.info({ scope }, "Admin Kudos Management page viewed");

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Kudos Management</h1>
        <div className="flex gap-2">
          <select
            className="rounded border border-white/20 bg-black/70 px-3 py-1 text-white"
            value={scope}
            onChange={e => setScope(e.target.value as typeof scope)}
          >
            <option value="site">Site</option>
            <option value="domain">Domain</option>
            <option value="department">Department</option>
          </select>
          <button
            className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
            onClick={() => refetch()}
          >
            Refresh
          </button>
        </div>
      </div>
      <KudosTable
        items={data?.items ?? []}
        loading={isLoading}
        error={error}
        refetch={refetch}
      />
    </AdminLayout>
  );
}

// 5. Helper functions (component-specific)
function KudosTable({
  items,
  loading,
  error,
  refetch,
}: {
  items: AdminKudosItem[];
  loading: boolean;
  error: unknown;
  refetch: () => void;
}) {
  if (loading) {
    return <div className="text-white">Loading kudos...</div>;
  }
  if (error) {
    loggers.admin.error({ error }, "Failed to load kudos feed");
    return <div className="text-red-500">Failed to load kudos.</div>;
  }
  if (!items.length) {
    return <div className="text-white/70">No kudos found for this scope.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg bg-black/70 p-2 shadow">
      <table className="min-w-full text-left text-sm text-white">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Message</th>
            <th className="px-3 py-2">Images</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Hidden</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((kudos) => (
            <KudosRow key={kudos.id} kudos={kudos} refetch={refetch} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KudosRow({ kudos, refetch }: { kudos: AdminKudosItem; refetch: () => void }) {
  const [isHiding, setIsHiding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hideMutation = api.kudos.adminHideKudos.useMutation();
  const deleteMutation = api.kudos.adminDeleteKudos.useMutation();

  const handleHide = async () => {
    setIsHiding(true);
    try {
      await hideMutation.mutateAsync({ kudosId: kudos.id, hidden: !kudos.hidden });
      loggers.admin.info({ kudosId: kudos.id, hidden: !kudos.hidden }, "Kudos hidden/unhidden");
      refetch();
    } catch (error) {
      loggers.admin.error({ error, kudosId: kudos.id }, "Failed to hide/unhide kudos");
    } finally {
      setIsHiding(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this kudos? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ kudosId: kudos.id });
      loggers.admin.warn({ kudosId: kudos.id }, "Kudos deleted by admin");
      refetch();
    } catch (error) {
      loggers.admin.error({ error, kudosId: kudos.id }, "Failed to delete kudos");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr className="border-b border-white/10 hover:bg-white/5">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {kudos.user.image && (
            <img
              src={kudos.user.image}
              alt={kudos.user.name ?? "User"}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <div>
            <div className="font-medium">
              {kudos.user.firstName} {kudos.user.lastName}
            </div>
            <div className="text-xs text-white/60">
              {kudos.user.department?.name ?? "-"}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 max-w-xs truncate whitespace-pre-line">
        {kudos.message}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 flex-wrap">
          {kudos.images?.map((img, i) => (
            <img
              key={i}
              src={img}
              alt="Kudos image"
              className="h-10 w-10 rounded object-cover border border-white/10"
            />
          ))}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {new Date(kudos.createdAt).toLocaleString()}
      </td>
      <td className="px-3 py-2">
        {kudos.hidden ? (
          <span className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">Hidden</span>
        ) : (
          <span className="rounded bg-green-700 px-2 py-1 text-xs font-semibold text-white">Visible</span>
        )}
      </td>
      <td className="px-3 py-2 flex gap-2">
        <button
          className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700 disabled:opacity-60"
          onClick={handleHide}
          disabled={isHiding || isDeleting}
        >
          {kudos.hidden ? "Unhide" : "Hide"}
        </button>
        <button
          className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800 disabled:opacity-60"
          onClick={handleDelete}
          disabled={isDeleting || isHiding}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

// 6. Default export is above

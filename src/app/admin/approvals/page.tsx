"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

import { AdminLayout } from "~/app/_components/admin-layout";
import { api } from "~/trpc/react";

type Status = "PENDING" | "ACTIVE" | "DISABLED";
const TABS: { status: Status; label: string }[] = [
  { status: "PENDING", label: "Waiting" },
  { status: "ACTIVE", label: "Live" },
  { status: "DISABLED", label: "Closed" },
];
const KIND = { ORG: "Organisation", FRIENDS: "Friends", COMMUNITY: "Community", TEAM: "Team" } as const;

/**
 * Site admins: approve new organisations and groups. While the service is
 * free, nothing goes live without this (owner, 18 Oct).
 */
export default function ApprovalsPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const utils = api.useUtils();
  const { data, isLoading, error } = api.groups.forReview.useQuery({ status });
  const setGroupStatus = api.groups.setStatus.useMutation({
    onSuccess: async (g) => {
      toast.success(g.status === "ACTIVE" ? "Approved: it's live" : g.status === "DISABLED" ? "Closed" : "Moved back to waiting");
      await utils.groups.forReview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Approvals</h1>
          <p className="mt-1 max-w-2xl text-white/70">
            New organisations and groups wait here until you approve them.
            People can join while they wait; gifting opens once they&apos;re live.
          </p>
        </div>

        <div role="tablist" aria-label="Status" className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.status}
              role="tab"
              aria-selected={status === t.status}
              onClick={() => setStatus(t.status)}
              className={`min-h-10 rounded px-4 py-2 text-sm font-semibold ${
                status === t.status ? "bg-white text-black" : "bg-black/60 text-white hover:bg-black/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-red-300">{error.message}</p>
        ) : isLoading ? (
          <p className="text-white/70">Loading…</p>
        ) : !data?.length ? (
          <p className="text-white/70">
            {status === "PENDING" ? "Nothing waiting for approval." : "None."}
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {data.map((g) => (
              <li key={g.id} className="flex flex-col gap-3 rounded-lg bg-black/70 p-4 text-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold break-all">{g.name}</h2>
                  <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase">
                    {KIND[g.kind]}
                  </span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-white/80">
                  {g.emailDomain && (
                    <>
                      <dt>Email domain</dt>
                      <dd className="break-all">{g.emailDomain}</dd>
                    </>
                  )}
                  <dt>Started by</dt>
                  <dd className="break-all">
                    {g.createdBy ? `${g.createdBy.name ?? "Unnamed"} (${g.createdBy.email ?? "no email"})` : "Unknown (from before groups)"}
                  </dd>
                  <dt>Members</dt>
                  <dd>{g.members}</dd>
                  <dt>Created</dt>
                  <dd>{new Date(g.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {g.status !== "ACTIVE" && (
                    <button
                      disabled={setGroupStatus.isPending}
                      onClick={() => setGroupStatus.mutate({ groupId: g.id, status: "ACTIVE" })}
                      className="min-h-10 rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                    >
                      {g.status === "PENDING" ? "Approve" : "Re-open"}
                    </button>
                  )}
                  {g.status !== "DISABLED" && (
                    <button
                      disabled={setGroupStatus.isPending}
                      onClick={() => {
                        if (window.confirm(`Close ${g.name}? Members won't be able to gift in it.`)) {
                          setGroupStatus.mutate({ groupId: g.id, status: "DISABLED" });
                        }
                      }}
                      className="min-h-10 rounded bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                    >
                      Close
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}

"use client";

import { toast } from "react-hot-toast";

import { api } from "~/trpc/react";

const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * Admin overview, Day 11: joining an organisation is on trust, so organisers
 * get two safeguards: an optional join code, and a list of recent joiners
 * they can remove.
 */
export function OrgTrustPanels() {
  const utils = api.useUtils();
  const { data: orgs } = api.groups.myOrgs.useQuery();
  const { data: joiners } = api.user.recentJoiners.useQuery();
  const setCode = api.groups.setOrgCode.useMutation({
    onSuccess: async (g) => {
      toast.success(g.joinCode ? "Join code set" : "Join code removed");
      await utils.groups.myOrgs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = api.user.removeFromOrganisation.useMutation({
    onSuccess: async () => {
      toast.success("Removed from the organisation");
      await utils.user.recentJoiners.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-2">
      {orgs?.map((org) => (
        <section key={org.id} aria-label={`Join code for ${org.name}`} className="rounded-lg bg-black/70 p-4 text-white">
          <h2 className="text-lg font-bold">Join code · {org.name}</h2>
          <p className="mt-1 text-sm text-white/75">
            Anyone with a {org.name} email can join. For extra safety, ask new
            members for a code too: share it somewhere only colleagues see.
          </p>
          {org.joinCode ? (
            <p className="mt-3 font-mono text-2xl font-bold tracking-widest" aria-label={`Join code ${org.joinCode.split("").join(" ")}`}>
              {formatCode(org.joinCode)}
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold">No code needed right now.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={setCode.isPending}
              onClick={() => setCode.mutate({ groupId: org.id, enabled: true })}
              className="min-h-10 rounded bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
            >
              {org.joinCode ? "Make a new code" : "Require a join code"}
            </button>
            {org.joinCode && (
              <button
                disabled={setCode.isPending}
                onClick={() => setCode.mutate({ groupId: org.id, enabled: false })}
                className="min-h-10 rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Stop requiring a code
              </button>
            )}
          </div>
        </section>
      ))}

      <section aria-labelledby="recent-joiners" className="rounded-lg bg-black/70 p-4 text-white lg:col-span-1">
        <h2 id="recent-joiners" className="text-lg font-bold">Joined in the last 30 days</h2>
        {!joiners?.length ? (
          <p className="mt-2 text-sm text-white/75">Nobody new yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10">
            {joiners.map((j) => (
              <li key={j.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="font-semibold">{j.name}</p>
                  <p className="text-sm break-all text-white/70">
                    {j.email ?? "no email"} · {j.group} ·{" "}
                    {new Date(j.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <button
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove ${j.name} from the organisation? Their account stays; they lose access to its wishlists.`)) {
                      remove.mutate({ userId: j.userId });
                    }
                  }}
                  className="min-h-10 rounded bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

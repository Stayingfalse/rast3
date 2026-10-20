"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { api, type RouterOutputs } from "~/trpc/react";

type JoinOutcome = RouterOutputs["groups"]["joinOrganisation"];

const STATUS = {
  PENDING: {
    label: "Waiting for approval",
    className: "bg-gold-soft text-ink",
  },
  ACTIVE: { label: "Live", className: "bg-pine-tint text-pine" },
  DISABLED: { label: "Closed", className: "bg-label-shade text-ink-soft" },
} as const;

/**
 * Day 12, journey A/B for workplaces: join your organisation with your work
 * email (plus its join code when it has one). If it isn't on the site yet,
 * offer to start it; personal email addresses are pointed to community and
 * friends groups instead, never to an organisation (owner, 18 Oct).
 */
export function WorkplaceCard() {
  const utils = api.useUtils();
  const router = useRouter();
  const { data: org, isLoading } = api.groups.myOrganisation.useQuery();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<JoinOutcome | null>(null);
  const [description, setDescription] = useState("");

  const refresh = async () => {
    await Promise.all([
      utils.groups.myOrganisation.invalidate(),
      utils.profile.getCurrentProfile.invalidate(),
    ]);
    router.refresh();
  };

  const join = api.groups.joinOrganisation.useMutation({
    onSuccess: async (res) => {
      setOutcome(res);
      if (res.result === "joined") {
        toast.success(`You've joined ${res.name}`);
        setEmail("");
        setCode("");
        setOutcome(null);
        await refresh();
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const start = api.groups.startOrganisation.useMutation({
    onSuccess: async (res) => {
      toast.success(`${res.domain} started. We'll approve it shortly.`);
      setOutcome(null);
      setEmail("");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const setTeam = api.groups.setMyTeam.useMutation({
    onSuccess: async () => {
      toast.success("Team saved");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const leave = api.groups.leaveOrganisation.useMutation({
    onSuccess: async () => {
      toast.success("You've left the organisation");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const card = "label-stock flex flex-col overflow-hidden";
  if (isLoading) return null;

  if (org) {
    const status = STATUS[org.status];
    return (
      <section aria-labelledby="workplace-heading" className={card}>
        <div className="airmail h-2.5" aria-hidden />
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps text-ink-soft">Your workplace</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <h2
            id="workplace-heading"
            className="font-expanded text-ink text-2xl leading-tight font-extrabold break-all"
          >
            {org.name}
          </h2>
          {org.workEmail && (
            <p className="text-ink-soft text-sm break-all">{org.workEmail}</p>
          )}
          {org.status === "PENDING" && (
            <p className="text-ink text-sm">
              New organisations are checked before they go live. You can invite
              colleagues now; gifting opens once it&apos;s approved.
            </p>
          )}
          {org.teams.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="label-caps text-ink-soft">Your team</span>
              <select
                value={org.teamId ?? ""}
                disabled={setTeam.isPending}
                onChange={(e) =>
                  setTeam.mutate({ departmentId: e.target.value || null })
                }
                className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2"
              >
                <option value="">No team</option>
                {org.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="text-ink-soft text-sm">
                Your team&apos;s wishlists are offered to you first.
              </span>
            </label>
          )}
          {org.isOrganiser && (
            <Link
              href={`/groups/${org.id}/manage`}
              className="btn-quiet text-ink self-start"
            >
              Manage workplace
            </Link>
          )}
          <button
            type="button"
            disabled={leave.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Leave ${org.name}? Your account and wishlist stay; you'll stop seeing its wishlists.`,
                )
              ) {
                leave.mutate();
              }
            }}
            className="text-ink-soft self-start text-sm underline underline-offset-4"
          >
            Wrong workplace? Leave it
          </button>
        </div>
      </section>
    );
  }

  const needsCode =
    outcome?.result === "needsCode" || outcome?.result === "wrongCode";
  return (
    <section aria-labelledby="workplace-heading" className={card}>
      <div className="airmail h-2.5" aria-hidden />
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          join.mutate({ workEmail: email, joinCode: code || undefined });
        }}
      >
        <h2
          id="workplace-heading"
          className="font-expanded text-ink text-xl font-bold"
        >
          Join your workplace
        </h2>
        <label className="flex flex-col gap-1">
          <span className="label-caps text-ink-soft">Work email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setOutcome(null);
            }}
            required
            autoComplete="email"
            placeholder="you@company.co.uk"
            className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2"
          />
          <span className="text-ink-soft text-sm">
            We don&apos;t email it; it just tells us which organisation is
            yours.
          </span>
        </label>

        {needsCode && (
          <label className="flex flex-col gap-1">
            <span className="label-caps text-ink-soft">
              Organisation join code
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCD-2345"
              aria-invalid={outcome?.result === "wrongCode"}
              className="border-rule text-ink rounded-label font-expanded min-h-11 border bg-white px-3 py-2 text-lg font-bold tracking-widest"
            />
            <span
              className={
                outcome?.result === "wrongCode"
                  ? "text-post text-sm"
                  : "text-ink-soft text-sm"
              }
            >
              {outcome?.result === "wrongCode"
                ? "That code doesn't match. Check it with your organiser."
                : `${outcome?.name} asks new members for a code. Your organiser can give it to you.`}
            </span>
          </label>
        )}

        {outcome?.result === "publicDomain" && (
          <div
            role="status"
            className="bg-label-shade rounded-label border-rule border p-3 text-sm"
          >
            <p className="text-ink font-semibold">
              That&apos;s a personal email address
            </p>
            <p className="text-ink-soft mt-1">
              Organisations are for workplace email addresses. With a personal
              address, join a friends group or community with an invite code, or
              start one below.
            </p>
          </div>
        )}

        {outcome?.result === "closed" && (
          <p
            role="status"
            className="bg-label-shade rounded-label border-rule border p-3 text-sm"
          >
            {outcome.name} is closed on Random Acts of Santa.
          </p>
        )}

        {outcome?.result === "noOrganisation" ? (
          <div
            role="status"
            className="bg-pine-tint rounded-label border-pine/30 flex flex-col gap-3 border p-4"
          >
            <p className="text-ink font-semibold">
              {outcome.domain} isn&apos;t on Random Acts of Santa yet
            </p>
            <p className="text-ink-soft text-sm">
              Start it and you&apos;ll be its organiser: anyone with a{" "}
              {outcome.domain} email can then join. New organisations go live
              once we&apos;ve approved them. Not your call? Check with your
              employer first.
            </p>
            <label className="flex flex-col gap-1">
              <span className="label-caps text-ink-soft">
                About it (optional)
              </span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                placeholder="e.g. Acme Ltd, London office"
                className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={start.isPending}
                onClick={() =>
                  start.mutate({
                    workEmail: email,
                    description: description || undefined,
                  })
                }
                className="btn-post"
              >
                {start.isPending ? "Starting…" : `Start ${outcome.domain}`}
              </button>
              <button
                type="button"
                onClick={() => setOutcome(null)}
                className="btn-quiet text-ink"
              >
                Not now
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={join.isPending || !email.trim()}
            className="btn-post self-start"
          >
            {join.isPending ? "Checking…" : "Join workplace"}
          </button>
        )}
      </form>
    </section>
  );
}

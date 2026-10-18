"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { api, type RouterOutputs } from "~/trpc/react";

type Group = RouterOutputs["groups"]["mine"][number];

const KIND_LABEL = { FRIENDS: "Friends", COMMUNITY: "Community" } as const;
const STATUS: Record<Group["status"], { label: string; className: string }> = {
  PENDING: { label: "Waiting for approval", className: "bg-gold-soft text-ink" },
  ACTIVE: { label: "Live", className: "bg-pine-tint text-pine" },
  DISABLED: { label: "Closed", className: "bg-label-shade text-ink-soft" },
};

const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** Start a friends or community group, join one by code, share invites. */
export function GroupsPanel() {
  const utils = api.useUtils();
  const router = useRouter();
  const { data: groups, isLoading } = api.groups.mine.useQuery();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"FRIENDS" | "COMMUNITY">("FRIENDS");
  const [code, setCode] = useState("");

  const create = api.groups.create.useMutation({
    onSuccess: async () => {
      setName("");
      toast.success("Group started. Share the invite link below.");
      await utils.groups.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const join = api.groups.join.useMutation({
    onSuccess: async (g) => {
      setCode("");
      toast.success(`You've joined ${g.name}`);
      await utils.groups.mine.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex w-full max-w-4xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-expanded text-frost text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Your groups
        </h1>
        <p className="text-frost-soft max-w-2xl text-lg">
          Start a group for friends or a community (a Discord server, a club, a
          street) and invite people with a link or code. Nobody needs a work
          email. We check each new group before it goes live.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          className="label-stock flex flex-col gap-4 overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ name, kind });
          }}
        >
          <div className="airmail h-2.5" aria-hidden />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <h2 className="font-expanded text-ink text-xl font-bold">
              Start a group
            </h2>
            <label className="flex flex-col gap-1">
              <span className="label-caps text-ink-soft">Group name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                minLength={2}
                placeholder="e.g. The Tuesday Quiz Team"
                className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2 font-semibold"
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="label-caps text-ink-soft mb-1">
                What kind of group?
              </legend>
              {(
                [
                  ["FRIENDS", "Friends or family", "People who know each other"],
                  ["COMMUNITY", "Community", "A Discord server, club or forum"],
                ] as const
              ).map(([value, title, hint]) => (
                <label
                  key={value}
                  className={`rounded-label flex min-h-11 cursor-pointer items-start gap-3 border px-3 py-2 ${
                    kind === value ? "border-post bg-post-tint" : "border-rule bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={value}
                    checked={kind === value}
                    onChange={() => setKind(value)}
                    className="accent-post mt-1.5"
                  />
                  <span>
                    <span className="text-ink block font-semibold">{title}</span>
                    <span className="text-ink-soft block text-sm">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button
              type="submit"
              disabled={create.isPending || name.trim().length < 2}
              className="btn-post self-start"
            >
              {create.isPending ? "Starting…" : "Start group"}
            </button>
          </div>
        </form>

        <form
          className="label-stock flex flex-col gap-4 overflow-hidden md:self-start"
          onSubmit={(e) => {
            e.preventDefault();
            join.mutate({ code });
          }}
        >
          <div className="airmail h-2.5" aria-hidden />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <h2 className="font-expanded text-ink text-xl font-bold">
              Have an invite code?
            </h2>
            <label className="flex flex-col gap-1">
              <span className="label-caps text-ink-soft">Code or link</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="ABCD-2345"
                className="border-rule text-ink rounded-label font-expanded min-h-11 border bg-white px-3 py-2 text-lg font-bold tracking-widest"
              />
            </label>
            <button
              type="submit"
              disabled={join.isPending || !code.trim()}
              className="btn-post self-start"
            >
              {join.isPending ? "Joining…" : "Join group"}
            </button>
          </div>
        </form>
      </div>

      <section aria-labelledby="my-groups-heading" className="flex flex-col gap-4">
        <h2
          id="my-groups-heading"
          className="font-expanded text-frost text-2xl font-extrabold uppercase"
        >
          Groups you&apos;re in
        </h2>
        {isLoading ? (
          <p className="text-frost-soft">Loading your groups…</p>
        ) : !groups?.length ? (
          <p className="text-frost-soft">
            None yet. Start one above, or ask a friend for their invite link.
          </p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const utils = api.useUtils();
  const newCode = api.groups.newCode.useMutation({
    onSuccess: async () => {
      toast.success("New code made. The old link no longer works.");
      await utils.groups.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const leave = api.groups.leave.useMutation({
    onSuccess: async () => {
      toast.success(`You've left ${group.name}`);
      await utils.groups.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const link =
    group.joinCode && typeof window !== "undefined"
      ? `${window.location.origin}/join/${group.joinCode}`
      : null;
  const status = STATUS[group.status];

  const shareInvite = async () => {
    if (!link) return;
    const text = `Join ${group.name} on Random Acts of Santa`;
    if (navigator.share) {
      await navigator.share({ title: text, text, url: link }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  return (
    <li className="label-stock flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-ink-soft">
            {KIND_LABEL[group.kind as keyof typeof KIND_LABEL]}
            {group.role === "ADMIN" ? " · Organiser" : ""}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <h3 className="font-expanded text-ink text-2xl leading-tight font-extrabold">
          {group.name}
        </h3>
        <p className="text-ink-soft text-sm">
          {group.members} {group.members === 1 ? "member" : "members"}
        </p>

        {group.joinCode && (
          <div className="border-rule flex flex-col gap-3 border-t border-dashed pt-4">
            <p className="label-caps text-ink-soft">Invite code</p>
            <p
              className="font-expanded text-post text-3xl font-extrabold tracking-[0.2em]"
              aria-label={`Invite code ${group.joinCode.split("").join(" ")}`}
            >
              {formatCode(group.joinCode)}
            </p>
            {link && (
              <p className="text-ink-soft text-sm break-all">
                <Link href={`/join/${group.joinCode}`} className="underline underline-offset-4">
                  {link.replace(/^https?:\/\//, "")}
                </Link>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void shareInvite()} className="btn-post">
                Share invite
              </button>
              <button
                type="button"
                disabled={newCode.isPending}
                onClick={() => newCode.mutate({ groupId: group.id })}
                className="btn-quiet text-ink"
              >
                New code
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={leave.isPending}
          onClick={() => {
            if (window.confirm(`Leave ${group.name}?`)) leave.mutate({ groupId: group.id });
          }}
          className="text-ink-soft mt-1 self-start text-sm underline underline-offset-4"
        >
          Leave group
        </button>
      </div>
    </li>
  );
}

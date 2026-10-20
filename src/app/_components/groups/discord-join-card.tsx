"use client";

import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { api, type RouterOutputs } from "~/trpc/react";

type Matches = RouterOutputs["groups"]["discordMatches"];

/**
 * Day 13: join community groups through the Discord servers you're in.
 * Hidden when the site has no Discord sign-in configured.
 */
export function DiscordJoinCard() {
  const router = useRouter();
  const params = useSearchParams();
  const utils = api.useUtils();
  const [available, setAvailable] = useState(false);
  const [matches, setMatches] = useState<Matches | null>(null);

  const find = api.groups.discordMatches.useMutation({
    onSuccess: setMatches,
    onError: (e) => toast.error(e.message),
  });
  const join = api.groups.joinViaDiscord.useMutation({
    onSuccess: async (g) => {
      toast.success(`You've joined ${g.name}`);
      await utils.groups.mine.invalidate();
      find.mutate();
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    void getProviders().then((p) => setAvailable(!!p?.discord));
  }, []);
  // Back from connecting Discord: look straight away
  const back = params.get("discord") === "1";
  useEffect(() => {
    if (available && back) find.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, back]);

  if (!available) return null;

  return (
    <section
      aria-labelledby="discord-heading"
      className="label-stock flex flex-col overflow-hidden"
    >
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-4 p-5">
        <h2
          id="discord-heading"
          className="font-expanded text-ink text-xl font-bold"
        >
          Join with Discord
        </h2>
        <p className="text-ink-soft text-sm">
          Some communities are linked to their Discord server. We check which
          servers you&apos;re in (and your roles there) and nothing else; we
          never post or read messages.
        </p>

        {matches?.needsDiscord ? (
          <div className="flex flex-col gap-2">
            <p className="text-ink text-sm">
              Connect your Discord account so we can see your servers.
            </p>
            <button
              type="button"
              onClick={() =>
                void signIn("discord", { callbackUrl: "/groups?discord=1" })
              }
              className="btn-post self-start"
            >
              Connect Discord
            </button>
          </div>
        ) : matches ? (
          matches.groups.length === 0 ? (
            <p className="text-ink text-sm">
              None of your Discord servers has a community here yet. Ask a
              server admin to start one and link it.
            </p>
          ) : (
            <ul className="divide-rule flex flex-col divide-y">
              {matches.groups.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-ink font-semibold">{g.name}</p>
                    <p className="text-ink-soft text-sm">
                      {g.server} · {g.members}{" "}
                      {g.members === 1 ? "member" : "members"}
                      {g.status === "PENDING" && " · waiting for approval"}
                    </p>
                  </div>
                  {g.alreadyMember ? (
                    <span className="text-pine text-sm font-semibold">
                      You&apos;re in
                    </span>
                  ) : g.roleOk ? (
                    <button
                      type="button"
                      disabled={join.isPending}
                      onClick={() => join.mutate({ groupId: g.id })}
                      className="btn-post"
                    >
                      Join
                    </button>
                  ) : (
                    <span className="text-ink-soft text-sm">
                      Needs a server role
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <button
            type="button"
            disabled={find.isPending}
            onClick={() => find.mutate()}
            className="btn-post self-start"
          >
            {find.isPending ? "Checking…" : "Find my Discord communities"}
          </button>
        )}
      </div>
    </section>
  );
}

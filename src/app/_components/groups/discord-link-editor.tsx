"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

import { api } from "~/trpc/react";

/** Organisers of a community group: link it to a Discord server (Day 13). */
export function DiscordLinkEditor({
  groupId,
  guildId,
  roleId,
}: {
  groupId: string;
  guildId: string | null;
  roleId: string | null;
}) {
  const utils = api.useUtils();
  const [guild, setGuild] = useState(guildId ?? "");
  const [role, setRole] = useState(roleId ?? "");
  const save = api.groups.setDiscordLink.useMutation({
    onSuccess: async (g) => {
      toast.success(
        g.discordGuildId ? "Discord server linked" : "Discord server unlinked",
      );
      await utils.groups.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      aria-label="Discord server"
      className="border-rule flex flex-col gap-3 border-t border-dashed pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          groupId,
          guildId: guild.trim() || null,
          roleId: role.trim() || undefined,
        });
      }}
    >
      <p className="label-caps text-ink-soft">Discord server</p>
      <p className="text-ink-soft text-sm">
        Members of your server can join with Discord. In Discord turn on
        Settings → Advanced → Developer Mode, then right-click your server (or a
        role) and choose Copy ID.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-ink text-sm font-semibold">Server ID</span>
        <input
          value={guild}
          onChange={(e) => setGuild(e.target.value)}
          inputMode="numeric"
          placeholder="e.g. 112233445566778899"
          className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-ink text-sm font-semibold">
          Required role ID (optional)
        </span>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          inputMode="numeric"
          placeholder="Leave empty to let anyone in the server join"
          className="border-rule text-ink rounded-label min-h-11 border bg-white px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={save.isPending} className="btn-post">
          {guildId ? "Save" : "Link server"}
        </button>
        {guildId && (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate({ groupId, guildId: null })}
            className="btn-quiet text-ink"
          >
            Unlink
          </button>
        )}
      </div>
    </form>
  );
}

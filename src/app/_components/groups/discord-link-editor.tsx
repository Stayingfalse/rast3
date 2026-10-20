"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api, type RouterOutputs } from "~/trpc/react";

type Servers = RouterOutputs["groups"]["discordServers"];

/**
 * Organisers of a community group: link it to a Discord server they own or
 * manage, picked from a list after connecting Discord (Day 16; no ids to
 * copy, no role requirement).
 */
export function DiscordLinkEditor({
  groupId,
  guildId,
  returnTo = "/groups",
}: {
  groupId: string;
  guildId: string | null;
  returnTo?: string;
}) {
  const utils = api.useUtils();
  const [servers, setServers] = useState<Servers | null>(null);
  const [picked, setPicked] = useState(guildId ?? "");

  const load = api.groups.discordServers.useMutation({
    onSuccess: setServers,
    onError: (e) => toast.error(e.message),
  });
  const save = api.groups.setDiscordLink.useMutation({
    onSuccess: async (g) => {
      toast.success(
        g.discordGuildId ? "Discord server linked" : "Discord server unlinked",
      );
      await utils.groups.mine.invalidate();
      await utils.groups.manage.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    load.mutate({ groupId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const linkedName = servers?.servers.find((s) => s.id === guildId)?.name;

  return (
    <section
      aria-label="Discord server"
      className="border-rule flex flex-col gap-3 border-t border-dashed pt-4"
    >
      <p className="label-caps text-ink-soft">Discord server</p>
      {guildId && (
        <p className="text-ink text-sm">
          Linked{linkedName ? ` to ${linkedName}` : ""}: anyone in the server
          can join with &ldquo;Join with Discord&rdquo;.
        </p>
      )}

      {servers?.needsDiscord ? (
        <div className="flex flex-col gap-2">
          <p className="text-ink-soft text-sm">
            Connect Discord to pick one of the servers you run.
          </p>
          <Button
            type="button"
            className="self-start"
            onClick={() => void signIn("discord", { callbackUrl: returnTo })}
          >
            Connect Discord
          </Button>
        </div>
      ) : servers ? (
        servers.servers.length === 0 ? (
          <p className="text-ink-soft text-sm">
            You don&apos;t own or manage any Discord servers we can see. Ask the
            server&apos;s owner to link it.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (picked) save.mutate({ groupId, guildId: picked });
            }}
          >
            <Field>
              <FieldLabel htmlFor={`discord-server-${groupId}`}>
                Server
              </FieldLabel>
              <Select value={picked} onValueChange={setPicked}>
                <SelectTrigger
                  id={`discord-server-${groupId}`}
                  className="w-full"
                >
                  <SelectValue placeholder="Choose a server you run" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {servers.servers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.icon && (
                          // eslint-disable-next-line @next/next/no-img-element -- Discord CDN icon
                          <img
                            src={s.icon}
                            alt=""
                            className="size-5 rounded-full"
                          />
                        )}
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Only servers you own or manage are listed.
              </FieldDescription>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!picked || picked === guildId || save.isPending}
              >
                {guildId ? "Change server" : "Link server"}
              </Button>
              {guildId && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ groupId, guildId: null })}
                >
                  Unlink
                </Button>
              )}
            </div>
          </form>
        )
      ) : (
        <p className="text-ink-soft text-sm">Checking Discord…</p>
      )}
    </section>
  );
}

"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { teamInviteLink, teamInviteMessage } from "~/lib/invite-message";
import { api, type RouterOutputs } from "~/trpc/react";

type Team = RouterOutputs["groups"]["team"];
type Member = Team["members"][number];

const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });

/**
 * A team's page (owner, 7 Nov): for its leads, the workplace's organisers
 * and site admins. Members and this season's numbers, an invite that joins
 * people straight into the team, renaming it, co-leads, and moving someone
 * out of the team (they stay in the workplace).
 */
export function TeamConsole({ teamId }: { teamId: string }) {
  const { data: t, isLoading, error } = api.groups.team.useQuery({ teamId });
  if (isLoading) return <p className="text-frost-soft">Loading…</p>;
  if (error || !t) return <p className="text-frost">{error?.message ?? "Team not found."}</p>;
  const runsWorkplace = t.viewer.organiser || t.viewer.siteAdmin;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        {runsWorkplace ? (
          <Link
            href={`/groups/${t.workplace.id}/manage`}
            className="text-frost-soft text-sm underline underline-offset-4"
          >
            ← {t.workplace.name}
          </Link>
        ) : (
          <Link href="/" className="text-frost-soft text-sm underline underline-offset-4">
            ← Home
          </Link>
        )}
        <span className="label-caps text-frost-soft">
          Team in {t.workplace.name} · {t.viewer.lead ? "you lead it" : runsWorkplace ? "organiser" : ""}
        </span>
        <h1 className="font-expanded text-frost text-4xl leading-none font-extrabold break-words uppercase sm:text-5xl">
          {t.name}
        </h1>
        <dl className="border-frost/25 text-frost grid grid-cols-3 border-y">
          {(
            [
              ["Members", t.stats.members],
              ["Wishlists picked up", t.stats.picked],
              ["Gifts sent", t.stats.gifted],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="py-3">
              <dt className="text-frost-soft text-sm">{k}</dt>
              <dd className="font-expanded tabular text-2xl font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-frost-soft text-sm">This Christmas, by the team&apos;s members as Santas.</p>
      </header>

      <Members t={t} runsWorkplace={runsWorkplace} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Invite t={t} />
        <Rename t={t} />
      </div>
    </div>
  );
}

function Members({ t, runsWorkplace }: { t: Team; runsWorkplace: boolean }) {
  const utils = api.useUtils();
  const [moving, setMoving] = useState<Member | null>(null);
  const refresh = () => utils.groups.team.invalidate({ teamId: t.id });
  const setLead = api.groups.setTeamLead.useMutation({
    onSuccess: async (_r, v) => {
      toast.success(v.lead ? "Now a team lead" : "No longer a team lead");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const move = api.groups.removeFromTeam.useMutation({
    onSuccess: async () => {
      toast.success("Moved out of the team");
      setMoving(null);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const showEmail = t.members.some((m) => m.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Colleagues who picked {t.name} as their team, newest first. Moving
          someone out keeps them in {t.workplace.name}; they can pick a team
          again on their home page.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {t.members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody yet. Send the invite below.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {showEmail && <TableHead>Email</TableHead>}
                <TableHead>Joined</TableHead>
                <TableHead>Wishlist</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.members.map((m) => {
                // leads add co-leads and can step down; organisers do anything
                const canUnlead = m.lead && (runsWorkplace || m.you);
                const canMove = !m.lead || runsWorkplace || m.you;
                return (
                  <TableRow key={m.userId}>
                    <TableCell className="font-semibold">
                      {m.name}
                      {m.you && <span className="text-muted-foreground font-normal"> (you)</span>}
                    </TableCell>
                    {showEmail && (
                      <TableCell className="text-muted-foreground max-w-56 truncate">{m.email ?? "—"}</TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">{day(m.joinedAt)}</TableCell>
                    <TableCell>{m.hasWishlist ? "Added" : "Not yet"}</TableCell>
                    <TableCell>
                      <Badge variant={m.lead ? "default" : "outline"}>{m.lead ? "Team lead" : "Member"}</Badge>
                    </TableCell>
                    <TableCell>
                      {(!m.lead || canUnlead || canMove) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.name}`}>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              {!m.lead && (
                                <DropdownMenuItem
                                  onSelect={() => setLead.mutate({ teamId: t.id, userId: m.userId, lead: true })}
                                >
                                  Make a team lead
                                </DropdownMenuItem>
                              )}
                              {canUnlead && (
                                <DropdownMenuItem
                                  onSelect={() => setLead.mutate({ teamId: t.id, userId: m.userId, lead: false })}
                                >
                                  {m.you ? "Step down as lead" : "Make a member"}
                                </DropdownMenuItem>
                              )}
                              {canMove && (
                                <DropdownMenuItem variant="destructive" onSelect={() => setMoving(m)}>
                                  {m.you ? "Leave the team" : "Move out of the team"}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {moving?.you ? `Leave ${t.name}?` : `Move ${moving?.name} out of ${t.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {moving?.you ? "You stay" : "They stay"} in {t.workplace.name}, with no team until
              {moving?.you ? " you pick" : " they pick"} one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => moving && move.mutate({ teamId: t.id, userId: moving.userId })}>
              {moving?.you ? "Leave" : "Move out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Invite({ t }: { t: Team }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = teamInviteLink(t.workplace, t, origin);
  const message = teamInviteMessage(t.workplace, t, origin);
  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bring your team</CardTitle>
        <CardDescription>
          Colleagues who join with this link land straight in {t.name}. They
          still need their @{t.workplace.emailDomain} email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="team-invite-message">Message</FieldLabel>
          <textarea
            id="team-invite-message"
            readOnly
            value={message}
            rows={6}
            className="border-input text-foreground rounded-label w-full border bg-white p-3"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void copy(message, "Message")}>
            Copy message
          </Button>
          <Button type="button" variant="outline" onClick={() => void copy(link, "Link")}>
            Copy link
          </Button>
          <Button asChild variant="outline">
            <a
              href={`mailto:?subject=${encodeURIComponent(`${t.name}: Random Acts of Santa`)}&body=${encodeURIComponent(message)}`}
            >
              Email
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Rename({ t }: { t: Team }) {
  const utils = api.useUtils();
  const [name, setName] = useState(t.name);
  const rename = api.groups.renameTeam.useMutation({
    onSuccess: async () => {
      toast.success("Team renamed");
      await utils.groups.team.invalidate({ teamId: t.id });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team name</CardTitle>
        <CardDescription>Only people in {t.workplace.name} see it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            rename.mutate({ teamId: t.id, name });
          }}
        >
          <Field>
            <FieldLabel htmlFor="team-name">Name</FieldLabel>
            <Input id="team-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            <FieldDescription>For example, Finance or Third floor.</FieldDescription>
          </Field>
          <Button type="submit" className="self-start" disabled={!name.trim() || name.trim() === t.name || rename.isPending}>
            Save name
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api, type RouterOutputs } from "~/trpc/react";
import { DiscordLinkEditor } from "./discord-link-editor";

type Console = RouterOutputs["groups"]["manage"];

const KIND = {
  ORG: "Workplace",
  FRIENDS: "Friends group",
  COMMUNITY: "Community",
  TEAM: "Team",
} as const;
const STATUS = {
  PENDING: "Waiting for approval",
  ACTIVE: "Live",
  DISABLED: "Closed",
} as const;
const day = (d: Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const formatCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;
const RECENT_MS = 30 * 24 * 3600_000;

/**
 * Day 16: one place per group for its organisers: members, the "Bring your
 * team" invite kit, and settings. Built on shadcn/ui.
 */
export function OrganiserConsole({ groupId }: { groupId: string }) {
  const { data: g, isLoading, error } = api.groups.manage.useQuery({ groupId });
  if (isLoading) return <p className="text-frost-soft">Loading…</p>;
  if (error || !g)
    return <p className="text-frost">{error?.message ?? "Group not found."}</p>;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/groups"
          className="text-frost-soft text-sm underline underline-offset-4"
        >
          ← Your groups
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-frost-soft">
            {KIND[g.kind]} · organiser
          </span>
          <Badge
            variant={g.status === "ACTIVE" ? "secondary" : "outline"}
            // frost text only on the outline badge, which sits on the night sky
            className={g.status === "ACTIVE" ? undefined : "text-frost"}
          >
            {STATUS[g.status]}
          </Badge>
        </div>
        <h1 className="font-expanded text-frost text-4xl leading-none font-extrabold break-words uppercase sm:text-5xl">
          {g.name}
        </h1>
        <dl className="border-frost/25 text-frost grid grid-cols-2 border-y sm:grid-cols-4">
          {[
            ["Members", g.stats.members],
            ["Joined in first 48 hours", g.stats.joinedFirst48h],
            ["Joined this week", g.stats.joinedLast7d],
            [
              g.kind === "ORG" ? "Gifts (all teams)" : "Wishlists gifted",
              g.kind === "ORG" ? "—" : `${g.stats.gifted} of ${g.stats.picked}`,
            ],
          ].map(([k, v]) => (
            <div key={k} className="py-3">
              <dt className="text-frost-soft text-sm">{k}</dt>
              <dd className="font-expanded tabular text-2xl font-extrabold">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invite">Bring your team</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <Members g={g} />
        </TabsContent>
        <TabsContent value="invite">
          <Invite g={g} />
        </TabsContent>
        <TabsContent value="settings">
          <Settings g={g} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Members({ g }: { g: Console }) {
  const utils = api.useUtils();
  const [removing, setRemoving] = useState<Console["members"][number] | null>(
    null,
  );
  const refresh = () => utils.groups.manage.invalidate({ groupId: g.id });
  const setRole = api.groups.setMemberRole.useMutation({
    onSuccess: async () => {
      toast.success("Role updated");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = api.groups.removeMember.useMutation({
    onSuccess: async () => {
      toast.success("Removed");
      setRemoving(null);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const canChangeRoles = g.kind !== "ORG";
  // only workplaces have an email column (owner, 26 and 27 Oct); site admins
  // still see emails everywhere
  const showEmail = g.kind === "ORG" || g.members.some((m) => m.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Newest first. Joining is on trust, so check the newcomers; removing
          someone keeps their account.
          {g.kind !== "ORG"
            ? ` Members' emails stay private in ${g.kind === "FRIENDS" ? "friends groups" : "communities"}.`
            : g.status !== "ACTIVE" && " Emails show once we've approved the group."}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
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
            {g.members.map((m) => {
              const recent =
                Date.now() - new Date(m.joinedAt).getTime() < RECENT_MS;
              return (
                <TableRow key={m.userId}>
                  <TableCell className="font-semibold">
                    <span className="flex items-center gap-2">
                      {m.name}
                      {recent && <Badge variant="secondary">New</Badge>}
                    </span>
                  </TableCell>
                  {showEmail && (
                    <TableCell className="text-muted-foreground max-w-56 truncate">
                      {m.email ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    {day(m.joinedAt)}
                  </TableCell>
                  <TableCell>{m.hasWishlist ? "Added" : "Not yet"}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "ADMIN" ? "default" : "outline"}>
                      {m.role === "ADMIN" ? "Organiser" : "Member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${m.name}`}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          {canChangeRoles && (
                            <DropdownMenuItem
                              onSelect={() =>
                                setRole.mutate({
                                  groupId: g.id,
                                  userId: m.userId,
                                  role: m.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                })
                              }
                            >
                              {m.role === "ADMIN"
                                ? "Make a member"
                                : "Make an organiser"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoving(m)}
                          >
                            Remove from group
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They leave {g.name} and their open pick-ups here are cancelled.
              Their account and wishlist stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removing &&
                remove.mutate({ groupId: g.id, userId: removing.userId })
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Invite({ g }: { g: Console }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const isOrg = g.kind === "ORG";
  // workplaces have their own memorable link: raosanta.uk/<domain> (23 Oct)
  const link = isOrg
    ? `${origin}/${g.emailDomain}`
    : g.joinCode
      ? `${origin}/join/${g.joinCode}`
      : origin;
  const message = isOrg
    ? `Christmas is coming! I've set us up on Random Acts of Santa: no draw, just share your Amazon wishlist and pick up a colleague's whenever you're ready. Join here with your @${g.emailDomain} email: ${link}${g.joinCode ? ` (join code ${formatCode(g.joinCode)})` : ""}`
    : `Christmas is coming! Join ${g.name} on Random Acts of Santa: no draw, just share your Amazon wishlist and pick up someone's whenever you're ready. Join here: ${link}`;

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Send an invite</CardTitle>
          <CardDescription>
            Groups that get going in the first 48 hours take off. Send this
            wherever your people already talk.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="invite-message">Message</FieldLabel>
            <textarea
              id="invite-message"
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
            <Button asChild variant="outline">
              <a
                href={`mailto:?subject=${encodeURIComponent("Join us on Random Acts of Santa")}&body=${encodeURIComponent(message)}`}
              >
                Email
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copy(message, "Message for Teams or Slack")}
            >
              Teams / Slack
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poster for the kitchen</CardTitle>
          <CardDescription>
            A printable A4 poster with a QR code to join. Pin it where people
            queue for the kettle.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm break-all">{link}</p>
          {g.joinCode && (
            <p className="font-expanded text-primary text-2xl font-extrabold tracking-[0.2em]">
              {formatCode(g.joinCode)}
            </p>
          )}
          <Button asChild className="self-start">
            <Link href={`/groups/${g.id}/poster`} target="_blank">
              Open printable poster
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Settings({ g }: { g: Console }) {
  const utils = api.useUtils();
  const [name, setName] = useState(g.name);
  const [team, setTeam] = useState("");
  const refresh = () => utils.groups.manage.invalidate({ groupId: g.id });
  const rename = api.groups.rename.useMutation({
    onSuccess: async () => {
      toast.success("Renamed");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const newCode = api.groups.newCode.useMutation({
    onSuccess: async () => {
      toast.success("New code made. Old links stop working.");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const orgCode = api.groups.setOrgCode.useMutation({
    onSuccess: async () => {
      toast.success("Join code updated");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const addTeam = api.groups.addTeam.useMutation({
    onSuccess: async () => {
      toast.success("Team added");
      setTeam("");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const isOrg = g.kind === "ORG";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {!isOrg && (
        <Card>
          <CardHeader>
            <CardTitle>Name</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                rename.mutate({ groupId: g.id, name });
              }}
            >
              <Field>
                <FieldLabel htmlFor="group-name">Group name</FieldLabel>
                <Input
                  id="group-name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Button
                type="submit"
                className="self-start"
                disabled={name.trim() === g.name || rename.isPending}
              >
                Save name
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isOrg ? "Join code" : "Invite code"}</CardTitle>
          <CardDescription>
            {isOrg
              ? "Optional: ask new members for a code as well as their work email."
              : "Anyone with the code or link can join. Make a new one if it has spread too far."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-expanded text-2xl font-extrabold tracking-[0.2em]">
            {g.joinCode ? formatCode(g.joinCode) : "No code needed"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                isOrg
                  ? orgCode.mutate({ groupId: g.id, enabled: true })
                  : newCode.mutate({ groupId: g.id })
              }
            >
              {g.joinCode ? "Make a new code" : "Require a code"}
            </Button>
            {isOrg && g.joinCode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  orgCode.mutate({ groupId: g.id, enabled: false })
                }
              >
                Stop requiring a code
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {g.kind === "COMMUNITY" && (
        <Card>
          <CardHeader>
            <CardTitle>Discord</CardTitle>
          </CardHeader>
          <CardContent>
            <DiscordLinkEditor
              groupId={g.id}
              guildId={g.discordGuildId}
              returnTo={`/groups/${g.id}/manage`}
            />
          </CardContent>
        </Card>
      )}

      {isOrg && (
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>
              Members pick their team; their team&apos;s wishlists are offered
              first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {g.teams.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {g.teams.map((t) => (
                  <li key={t.id} className="flex justify-between gap-4">
                    <span>{t.name}</span>
                    <span className="text-muted-foreground tabular">
                      {t.members}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No teams yet.</p>
            )}
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                addTeam.mutate({ groupId: g.id, name: team });
              }}
            >
              <Field>
                <FieldLabel htmlFor="new-team">New team</FieldLabel>
                <Input
                  id="new-team"
                  value={team}
                  maxLength={100}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Finance"
                />
                <FieldDescription>
                  Teams are only visible inside your organisation.
                </FieldDescription>
              </Field>
              <Button
                type="submit"
                className="self-start"
                disabled={!team.trim() || addTeam.isPending}
              >
                Add team
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

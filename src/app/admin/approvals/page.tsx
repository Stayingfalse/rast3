"use client";

import Link from "next/link";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

type Status = "PENDING" | "ACTIVE" | "DISABLED";
const TABS: { status: Status; label: string }[] = [
  { status: "PENDING", label: "Waiting" },
  { status: "ACTIVE", label: "Live" },
  { status: "DISABLED", label: "Closed" },
];
const KIND = {
  ORG: "Workplace",
  FRIENDS: "Friends group",
  COMMUNITY: "Community",
  TEAM: "Team",
} as const;

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "Name · about 1,234 members", or a note when the name isn't recorded yet. */
const discordServer = (name: string | null, members: number | null) =>
  name
    ? `${name}${members != null ? ` · about ${members.toLocaleString("en-GB")} ${members === 1 ? "member" : "members"}` : ""}`
    : "Linked (name shows once the organiser opens their console)";

/**
 * Site admins: approve new organisations and communities (owner, 18 Oct).
 * Friends groups, and communities linked to a Discord server, go live
 * without approval (owner, 6 Nov), so they're listed below the queue
 * instead: big friends groups to check, and the past week's new ones.
 */
export default function ApprovalsPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const utils = api.useUtils();
  const { data, isLoading, error } = api.groups.forReview.useQuery({ status });
  const setGroupStatus = api.groups.setStatus.useMutation({
    onSuccess: async (g) => {
      toast.success(
        g.status === "ACTIVE"
          ? "Approved: it's live"
          : g.status === "DISABLED"
            ? "Closed"
            : "Moved back to waiting",
      );
      await utils.groups.forReview.invalidate();
      await utils.groups.friendsToCheck.invalidate();
      await utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">
          Approvals
        </h1>
        <p className="text-frost-soft max-w-2xl">
          New workplaces and communities wait here until you approve them.
          People can join while they wait; gifting opens once they&apos;re
          live. Friends groups, and communities linked to their Discord
          server, go live straight away: they&apos;re listed below so you can
          still keep an eye on them.
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.status} value={t.status}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* one list, filtered by the tabs: it sits in the active tab's panel */}
        <TabsContent value={status} className="flex flex-col gap-4 pt-2">
          {error ? (
            <p className="text-frost">{error.message}</p>
          ) : isLoading ? (
            <p className="text-frost-soft">Loading…</p>
          ) : !data?.length ? (
            <p className="text-frost-soft">
              {status === "PENDING" ? "Nothing waiting for approval." : "None."}
            </p>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {data.map((g) => (
                <li key={g.id}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="break-all">{g.name}</CardTitle>
                        <Badge variant="outline">{KIND[g.kind]}</Badge>
                      </div>
                      <CardDescription>
                        Created{" "}
                        {new Date(g.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-[7rem_1fr] text-sm">
                        {g.emailDomain && (
                          <>
                            <dt className="text-ink-soft py-1">Email domain</dt>
                            <dd className="text-ink py-1 break-all">{g.emailDomain}</dd>
                          </>
                        )}
                        {g.discordGuildId && (
                          <>
                            <dt className="text-ink-soft py-1">Discord server</dt>
                            <dd className="text-ink py-1 break-words">
                              {discordServer(g.discordGuildName, g.discordMemberCount)}
                            </dd>
                          </>
                        )}
                        <dt className="text-ink-soft py-1">Started by</dt>
                        <dd className="text-ink py-1 break-all">
                          {g.createdBy
                            ? `${g.createdBy.name ?? "Unnamed"} (${g.createdBy.email ?? "no email"})`
                            : "Unknown (from before groups)"}
                        </dd>
                        <dt className="text-ink-soft py-1">Members</dt>
                        <dd className="text-ink py-1 tabular-nums">{g.members}</dd>
                      </dl>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2">
                      {g.status !== "ACTIVE" && (
                        <Button
                          disabled={setGroupStatus.isPending}
                          onClick={() =>
                            setGroupStatus.mutate({ groupId: g.id, status: "ACTIVE" })
                          }
                        >
                          {g.status === "PENDING" ? "Approve" : "Re-open"}
                        </Button>
                      )}
                      {g.status !== "DISABLED" && (
                        <CloseGroup
                          name={g.name}
                          disabled={setGroupStatus.isPending}
                          onClose={() =>
                            setGroupStatus.mutate({ groupId: g.id, status: "DISABLED" })
                          }
                        />
                      )}
                      {g.kind !== "TEAM" && (
                        <Button asChild variant="link">
                          <Link href={`/groups/${g.id}/manage`}>Open console</Link>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <FriendsGroups
        closing={setGroupStatus.isPending}
        onClose={(groupId) => setGroupStatus.mutate({ groupId, status: "DISABLED" })}
      />
      <DiscordCommunities
        closing={setGroupStatus.isPending}
        onClose={(groupId) => setGroupStatus.mutate({ groupId, status: "DISABLED" })}
      />
    </div>
  );
}

/** Close, after a confirmation: members can't pick up in it until it's re-opened. */
function CloseGroup({
  name,
  disabled,
  onClose,
}: {
  name: string;
  disabled: boolean;
  onClose: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled} aria-label={`Close ${name}`}>
          Close
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Members won&apos;t be able to pick up wishlists in it. You can
            re-open it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it open</AlertDialogCancel>
          <AlertDialogAction onClick={onClose}>Close group</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type FriendsGroup = RouterOutputs["groups"]["friendsToCheck"]["recent"][number];

/** Live friends groups to look over: the oversized ones, then the past week's. */
function FriendsGroups({
  closing,
  onClose,
}: {
  closing: boolean;
  onClose: (groupId: string) => void;
}) {
  const { data, isLoading, error } = api.groups.friendsToCheck.useQuery();

  const table = (rows: FriendsGroup[], label: string) => (
    <Table aria-label={label}>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="max-w-64">
                <p className="text-ink truncate font-semibold">{g.name}</p>
                <p className="text-ink-soft truncate text-xs">
                  {g.createdBy
                    ? `Started by ${g.createdBy.name ?? g.createdBy.email ?? "someone unnamed"}`
                    : "Starter unknown"}
                </p>
              </TableCell>
              <TableCell className="text-right tabular-nums">{g.members}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{date(g.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="link">
                    <Link href={`/groups/${g.id}/manage`}>Open console</Link>
                  </Button>
                  <CloseGroup
                    name={g.name}
                    disabled={closing}
                    onClose={() => onClose(g.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
    </Table>
  );

  return (
    <section aria-labelledby="friends-groups-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2
          id="friends-groups-heading"
          className="font-expanded text-frost text-2xl font-extrabold uppercase"
        >
          Friends groups
        </h2>
        <p className="text-frost-soft max-w-2xl">
          These went live without approval. Close any that don&apos;t look like
          friends and family; members keep their accounts.
        </p>
      </div>
      {error ? (
        <p className="text-frost">{error.message}</p>
      ) : isLoading || !data ? (
        <p className="text-frost-soft">Loading…</p>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>
                  <h3 className="font-expanded text-ink text-lg font-bold">
                    Large friends groups to check
                  </h3>
                </CardTitle>
                {data.large.length > 0 && (
                  <Badge className="tabular-nums">{data.large.length}</Badge>
                )}
              </div>
              <CardDescription>
                Friends groups are for friends and family. These have grown past{" "}
                {data.over} members; people can still join until you close one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.large.length ? (
                table(data.large, "Large friends groups to check")
              ) : (
                <p className="text-ink-soft">None over {data.over} members.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h3 className="font-expanded text-ink text-lg font-bold">
                  Started in the last {data.days} days
                </h3>
              </CardTitle>
              <CardDescription>Newest first, up to 100.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recent.length ? (
                table(data.recent, `Friends groups started in the last ${data.days} days`)
              ) : (
                <p className="text-ink-soft">No new friends groups this week.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

type DiscordCommunity = RouterOutputs["groups"]["friendsToCheck"]["discord"][number];

/** Communities that went live by linking their Discord server this past week. */
function DiscordCommunities({
  closing,
  onClose,
}: {
  closing: boolean;
  onClose: (groupId: string) => void;
}) {
  const { data, isLoading, error } = api.groups.friendsToCheck.useQuery();
  const rows: DiscordCommunity[] = data?.discord ?? [];

  return (
    <section aria-labelledby="discord-communities-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2
          id="discord-communities-heading"
          className="font-expanded text-frost text-2xl font-extrabold uppercase"
        >
          Communities on Discord
        </h2>
        <p className="text-frost-soft max-w-2xl">
          A community goes live when its organiser links a Discord server they
          own or manage. Check the server looks real; a brand-new server with a
          handful of members is worth a look.
        </p>
      </div>
      {error ? (
        <p className="text-frost">{error.message}</p>
      ) : isLoading || !data ? (
        <p className="text-frost-soft">Loading…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h3 className="font-expanded text-ink text-lg font-bold">
                Linked in the last {data.days} days
              </h3>
            </CardTitle>
            <CardDescription>Newest first, up to 100.</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length ? (
              <Table aria-label={`Communities linked to Discord in the last ${data.days} days`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Community</TableHead>
                    <TableHead>Discord server</TableHead>
                    <TableHead className="text-right">Members here</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="max-w-56">
                        <p className="text-ink truncate font-semibold">{g.name}</p>
                        <p className="text-ink-soft truncate text-xs">
                          {g.createdBy
                            ? `Started by ${g.createdBy.name ?? g.createdBy.email ?? "someone unnamed"}`
                            : "Starter unknown"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="text-ink truncate font-semibold">
                          {g.discordGuildName ?? "Name not recorded"}
                        </p>
                        {g.discordMemberCount != null && (
                          <p className="text-ink-soft text-xs tabular-nums">
                            about {g.discordMemberCount.toLocaleString("en-GB")} on Discord
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{g.members}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {g.discordLinkedAt ? date(g.discordLinkedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="link">
                            <Link href={`/groups/${g.id}/manage`}>Open console</Link>
                          </Button>
                          <CloseGroup
                            name={g.name}
                            disabled={closing}
                            onClose={() => onClose(g.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-ink-soft">No communities linked this week.</p>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "react-hot-toast";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDebounced } from "~/lib/use-debounced";
import { api } from "~/trpc/react";

const KINDS = { ORG: "Workplace", COMMUNITY: "Community", FRIENDS: "Friends group" } as const;
const STATUSES = { ACTIVE: "Live", PENDING: "Waiting", DISABLED: "Closed" } as const;
type Kind = keyof typeof KINDS;
type Status = keyof typeof STATUSES;
const ALL = "all";

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Every group on the site (Day 17); teams live inside their workplace. */
export default function AdminGroupsPage() {
  return (
    <Suspense fallback={<p className="text-frost-soft">Loading…</p>}>
      <GroupsTable />
    </Suspense>
  );
}

function GroupsTable() {
  const params = useSearchParams();
  const initialKind = params.get("kind");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind | typeof ALL>(
    initialKind && initialKind in KINDS ? (initialKind as Kind) : ALL,
  );
  const [status, setStatus] = useState<Status | typeof ALL>(ALL);

  const search = useDebounced(q);
  const utils = api.useUtils();
  const { data, isLoading, error } = api.admin.groups.useQuery({
    q: search,
    kind: kind === ALL ? null : kind,
    status: status === ALL ? null : status,
  });
  const setOpenEarly = api.admin.setOpenEarly.useMutation({
    onSuccess: async (_, v) => {
      toast.success(v.open ? "Open early: pick-ups work now" : "Back to the season's dates");
      await utils.admin.groups.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const setGroupStatus = api.groups.setStatus.useMutation({
    onSuccess: async (g) => {
      toast.success(g.status === "ACTIVE" ? "It's live" : "Closed");
      await utils.admin.groups.invalidate();
      await utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">Groups</h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
            <Field>
              <FieldLabel htmlFor="group-search">Search</FieldLabel>
              <Input
                id="group-search"
                type="search"
                placeholder="Name or email domain"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="group-kind">Kind</FieldLabel>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind | typeof ALL)}>
                <SelectTrigger id="group-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>All kinds</SelectItem>
                    {Object.entries(KINDS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="group-status">Status</FieldLabel>
              <Select value={status} onValueChange={(v) => setStatus(v as Status | typeof ALL)}>
                <SelectTrigger id="group-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>Any status</SelectItem>
                    {Object.entries(STATUSES).map(([s, label]) => (
                      <SelectItem key={s} value={s}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {error ? (
            <p className="text-ink">{error.message}</p>
          ) : isLoading || !data ? (
            <p className="text-ink-soft">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-ink-soft">No groups match.</p>
          ) : (
            <>
              <p className="text-ink-soft text-sm tabular-nums">
                {data.length === 200 ? "Showing the newest 200" : `${data.length} groups`}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead>Started by</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="max-w-64">
                          <p className="text-ink truncate font-semibold">{g.name}</p>
                          <p className="text-ink-soft truncate text-xs">
                            {[
                              g.emailDomain,
                              g.kind === "ORG" && `${g.teams} ${g.teams === 1 ? "team" : "teams"}`,
                              g.discord && "Discord linked",
                              g.openEarly && "Open early",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </TableCell>
                        <TableCell>{KINDS[g.kind as Kind] ?? g.kind}</TableCell>
                        <TableCell>
                          <Badge variant={g.status === "ACTIVE" ? "secondary" : "outline"}>
                            {STATUSES[g.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{g.members}</TableCell>
                        <TableCell className="text-ink-soft max-w-48 truncate">
                          {g.createdBy?.name ?? g.createdBy?.email ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {date(g.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${g.name}`}>
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem asChild>
                                  <Link href={`/groups/${g.id}/manage`}>Open console</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setOpenEarly.mutate({ groupId: g.id, open: !g.openEarly })
                                  }
                                >
                                  {g.openEarly ? "Follow season dates" : "Open early"}
                                </DropdownMenuItem>
                                {g.status !== "ACTIVE" && (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      setGroupStatus.mutate({ groupId: g.id, status: "ACTIVE" })
                                    }
                                  >
                                    {g.status === "PENDING" ? "Approve" : "Re-open"}
                                  </DropdownMenuItem>
                                )}
                                {g.status !== "DISABLED" && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() =>
                                      setGroupStatus.mutate({ groupId: g.id, status: "DISABLED" })
                                    }
                                  >
                                    Close
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

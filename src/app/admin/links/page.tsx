"use client";

import { Building2Icon, HeartIcon, MessagesSquareIcon, MoreHorizontalIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { useDebounced } from "~/lib/use-debounced";
import { api, type RouterOutputs } from "~/trpc/react";
import { ALL_GROUPS, GroupFilter } from "../_components/group-filter";

type Row = RouterOutputs["admin"]["wishlists"]["rows"][number];
type Show = "all" | "problems" | "notCheckedIn" | "notPickedUp";

const SHOW: Record<Show, string> = {
  all: "Everyone",
  problems: "Problems reported",
  notCheckedIn: "Not checked in this season",
  notPickedUp: "Checked in, not picked up yet",
};
const KIND = {
  ORG: { label: "Workplace", Icon: Building2Icon },
  TEAM: { label: "Team", Icon: UsersIcon },
  COMMUNITY: { label: "Community", Icon: MessagesSquareIcon },
  FRIENDS: { label: "Friends group", Icon: HeartIcon },
} as const;
const PROBLEM: Record<string, string> = {
  NO_ADDRESS: "No delivery address",
  NO_ITEMS: "Empty list",
  DOESNT_EXIST: "Link doesn't work",
  OTHER: "Something else",
};
const seen = (d: Date | string | null) =>
  d ? `seen ${new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" })}` : null;

/**
 * Admin › Wishlists (owner, 27 Nov): rebuilt like the other admin pages.
 * Everyone with a wishlist, once, with every group they're in; filter by any
 * group (workplace, team, community, friends) or by what needs attention.
 */
export default function AdminWishlistsPage() {
  const [q, setQ] = useState("");
  const [groupId, setGroupId] = useState<string>(ALL_GROUPS);
  const [show, setShow] = useState<Show>("all");
  const search = useDebounced(q);
  const { data, isLoading, error } = api.admin.wishlists.useQuery({
    q: search,
    groupId: groupId === ALL_GROUPS ? null : groupId,
    show,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">Wishlists</h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_16rem_16rem]">
            <Field>
              <FieldLabel htmlFor="wishlist-search">Search</FieldLabel>
              <Input
                id="wishlist-search"
                type="search"
                placeholder="Name or email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </Field>
            <GroupFilter id="wishlist-group" value={groupId} onChange={setGroupId} />
            <Field>
              <FieldLabel htmlFor="wishlist-show">Show</FieldLabel>
              <Select value={show} onValueChange={(v) => setShow(v as Show)}>
                <SelectTrigger id="wishlist-show" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(SHOW).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
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
          ) : data.rows.length === 0 ? (
            <p className="text-ink-soft">No wishlists match.</p>
          ) : (
            <>
              <p className="text-ink-soft text-sm tabular-nums">
                {data.limited
                  ? `Showing ${data.rows.length} of ${data.total}: search or filter to narrow it`
                  : `${data.total} ${data.total === 1 ? "wishlist" : "wishlists"}`}
                {" · "}
                {data.rows.filter((r) => r.problems.length).length} with problems ·{" "}
                {data.rows.filter((r) => r.checkedIn).length} checked in this season
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Groups</TableHead>
                      <TableHead>This season</TableHead>
                      <TableHead className="text-right">Picked up</TableHead>
                      <TableHead className="text-right">Gifted</TableHead>
                      <TableHead>Problems</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((r) => (
                      <WishlistRow key={r.id} row={r} />
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

function WishlistRow({ row: r }: { row: Row }) {
  const to = r.email ?? r.workEmail;
  const mailto =
    to && r.problems.length
      ? `mailto:${to}?subject=${encodeURIComponent("Your Random Acts of Santa wishlist needs a quick fix")}&body=${encodeURIComponent(
          `Hi ${r.name.split(" ")[0]},\n\nSantas who picked up your wishlist reported:\n${r.problems
            .map((p) => `- ${PROBLEM[p.type] ?? p.type}${p.description ? `: ${p.description}` : ""}`)
            .join("\n")}\n\nYour list: ${r.wishlistUrl}\n\nOnce it's fixed, open raosanta.uk and choose "Resolve All" on the message about your wishlist, so Santas can try again.\n\nThanks,\nRandom Acts of Santa`,
        )}`
      : null;
  return (
    <TableRow>
      <TableCell className="max-w-64">
        <p className="text-ink truncate font-semibold">{r.name}</p>
        <p className="text-ink-soft truncate text-xs">
          {[r.email, r.workEmail && r.workEmail !== r.email && `work: ${r.workEmail}`, seen(r.lastSeenAt)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </TableCell>
      <TableCell className="max-w-80">
        {r.groups.length ? (
          <ul className="flex flex-wrap gap-1" aria-label={`${r.name}'s groups`}>
            {r.groups.map((g) => {
              const { Icon, label } = KIND[g.kind as keyof typeof KIND] ?? KIND.FRIENDS;
              return (
                <li key={g.id}>
                  <Badge variant={g.kind === "ORG" || g.kind === "TEAM" ? "secondary" : "outline"} className="gap-1">
                    <Icon aria-hidden className="size-3" />
                    <span className="sr-only">{label}:</span>
                    {g.name}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="text-ink-soft text-sm">No group yet</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={r.checkedIn ? "secondary" : "outline"}>{r.checkedIn ? "Checked in" : "Not yet"}</Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{r.pickedUp}</TableCell>
      <TableCell className="text-right tabular-nums">{r.gifted}</TableCell>
      <TableCell className="max-w-56">
        {r.problems.length ? (
          <ul className="text-post-deep flex flex-col gap-0.5 text-sm">
            {r.problems.map((p, i) => (
              <li key={i} className="truncate" title={p.description ?? undefined}>
                {PROBLEM[p.type] ?? p.type}
                {p.description ? <span className="text-ink-soft">: {p.description}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-ink-soft text-sm">None</span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href={r.wishlistUrl} target="_blank" rel="noopener noreferrer">
                  Open wishlist
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void navigator.clipboard
                    .writeText(r.wishlistUrl)
                    .then(() => toast.success("Wishlist link copied"))
                    .catch(() => toast.error("Couldn't copy the link"))
                }
              >
                Copy wishlist link
              </DropdownMenuItem>
              {mailto && (
                <DropdownMenuItem asChild>
                  <a href={mailto}>Email about the problems</a>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

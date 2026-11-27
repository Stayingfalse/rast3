"use client";

/* eslint-disable @next/next/no-img-element -- stored thank-you photos, through our image proxy */
import { MoreHorizontalIcon } from "lucide-react";
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
} from "~/components/ui/alert-dialog";
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
import { getProxyImageUrl } from "~/utils/image-utils";
import { ALL_GROUPS, GroupFilter } from "../_components/group-filter";

type Row = RouterOutputs["admin"]["kudos"]["rows"][number];
type Show = "all" | "visible" | "hidden" | "photos";
const SHOW: Record<Show, string> = {
  all: "All thank-yous",
  visible: "Visible",
  hidden: "Hidden",
  photos: "With photos",
};
const KIND: Record<string, string> = { FRIENDS: "Friends group", COMMUNITY: "Community" };
const when = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

/**
 * Admin › Kudos (owner, 27 Nov): rebuilt like the other admin pages. Every
 * thank-you (it showed the public feed's newest 30), searchable, filterable
 * by any group, with hide, unhide and delete.
 */
export default function AdminKudosPage() {
  const [q, setQ] = useState("");
  const [groupId, setGroupId] = useState<string>(ALL_GROUPS);
  const [show, setShow] = useState<Show>("all");
  const [deleting, setDeleting] = useState<Row | null>(null);
  const search = useDebounced(q);
  const utils = api.useUtils();
  const { data, isLoading, error } = api.admin.kudos.useQuery({
    q: search,
    groupId: groupId === ALL_GROUPS ? null : groupId,
    show,
  });
  const hide = api.kudos.adminHideKudos.useMutation({
    onSuccess: async (k) => {
      toast.success(k.hidden ? "Hidden from the feeds" : "Visible again");
      await utils.admin.kudos.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = api.kudos.adminDeleteKudos.useMutation({
    onSuccess: async () => {
      toast.success("Deleted, with its photos");
      setDeleting(null);
      await utils.admin.kudos.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">Kudos</h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_16rem_12rem]">
            <Field>
              <FieldLabel htmlFor="kudos-search">Search</FieldLabel>
              <Input
                id="kudos-search"
                type="search"
                placeholder="Message, name or email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </Field>
            <GroupFilter id="kudos-group" value={groupId} onChange={setGroupId} />
            <Field>
              <FieldLabel htmlFor="kudos-show">Show</FieldLabel>
              <Select value={show} onValueChange={(v) => setShow(v as Show)}>
                <SelectTrigger id="kudos-show" className="w-full">
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
            <p className="text-ink-soft">No thank-yous match.</p>
          ) : (
            <>
              <p className="text-ink-soft text-sm tabular-nums">
                {data.limited ? `Showing the newest ${data.rows.length} of ${data.total}` : `${data.total} ${data.total === 1 ? "thank-you" : "thank-yous"}`}
                {data.hidden ? ` · ${data.hidden} hidden` : ""}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thank-you</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((k) => (
                      <TableRow key={k.id} className={k.hidden ? "opacity-75" : undefined}>
                        <TableCell className="max-w-96 min-w-64 whitespace-normal">
                          <p className="text-ink line-clamp-3">{k.message}</p>
                          {k.photos.length > 0 && (
                            <ul className="mt-2 flex gap-1.5" aria-label="Photos">
                              {k.photos.map((url, i) => (
                                <li key={url}>
                                  <a href={getProxyImageUrl(url)} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={getProxyImageUrl(url)}
                                      alt={`Photo ${i + 1}`}
                                      className="border-rule size-12 rounded-sm border object-cover"
                                      loading="lazy"
                                    />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell className="max-w-56">
                          <p className="text-ink truncate font-semibold">{k.author.name}</p>
                          <p className="text-ink-soft truncate text-xs">{k.author.email}</p>
                        </TableCell>
                        <TableCell className="max-w-48">
                          {k.group ? (
                            <>
                              <p className="text-ink truncate">{k.group.name}</p>
                              <p className="text-ink-soft text-xs">{KIND[k.group.kind] ?? "Group"}</p>
                            </>
                          ) : (
                            <span className="text-ink-soft">Workplace</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{when(k.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={k.hidden ? "outline" : "secondary"}>{k.hidden ? "Hidden" : "Visible"}</Badge>
                          {k.moderated && (
                            <p className="text-ink-soft mt-1 text-xs">
                              {k.hidden ? "Hidden" : "Changed"} {when(k.moderated.at)}
                              {k.moderated.by ? ` by ${k.moderated.by}` : ""}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${k.author.name}'s thank-you`}>
                                <MoreHorizontalIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onSelect={() => hide.mutate({ kudosId: k.id, hidden: !k.hidden })}>
                                  {k.hidden ? "Show again" : "Hide from the feeds"}
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(k)}>
                                  Delete…
                                </DropdownMenuItem>
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

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this thank-you?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.author.name}&apos;s thank-you and its photos are deleted for good. To take it off
              the feeds but keep it, hide it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate({ kudosId: deleting.id });
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

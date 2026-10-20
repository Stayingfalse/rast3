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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDebounced } from "~/lib/use-debounced";
import { api, type RouterOutputs } from "~/trpc/react";

type Person = RouterOutputs["admin"]["users"]["users"][number];
type Pending =
  | { kind: "siteAdmin"; person: Person; siteAdmin: boolean }
  | { kind: "delete"; person: Person };

/** Everyone on the site (Day 17), newest profiles first, 25 a page. */
export default function AdminPeoplePage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const search = useDebounced(q);
  useEffect(() => setPage(0), [search]);

  const utils = api.useUtils();
  const { data: me } = api.profile.getCurrentProfile.useQuery();
  const { data, isLoading, error } = api.admin.users.useQuery({ q: search, page });
  const done = async (message: string) => {
    toast.success(message);
    setPending(null);
    await utils.admin.users.invalidate();
    await utils.admin.overview.invalidate();
  };
  const setSiteAdmin = api.admin.setSiteAdmin.useMutation({
    onSuccess: (_, v) => done(v.siteAdmin ? "Now a site admin" : "No longer a site admin"),
    onError: (e) => toast.error(e.message),
  });
  const remove = api.admin.deleteUser.useMutation({
    onSuccess: () => done("Account deleted"),
    onError: (e) => toast.error(e.message),
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">People</h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field className="sm:max-w-md">
            <FieldLabel htmlFor="people-search">Search</FieldLabel>
            <Input
              id="people-search"
              type="search"
              placeholder="Name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>

          {error ? (
            <p className="text-ink">{error.message}</p>
          ) : isLoading || !data ? (
            <p className="text-ink-soft">Loading…</p>
          ) : data.users.length === 0 ? (
            <p className="text-ink-soft">Nobody matches.</p>
          ) : (
            <>
              <p className="text-ink-soft text-sm tabular-nums">
                {data.total.toLocaleString("en-GB")} {data.total === 1 ? "person" : "people"}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Groups</TableHead>
                      <TableHead>Wishlist</TableHead>
                      <TableHead className="text-right">Picked up</TableHead>
                      <TableHead className="text-right">Gifted</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-64">
                          <div className="flex items-center gap-2">
                            <p className="text-ink truncate font-semibold">
                              {p.name ?? "Unnamed"}
                            </p>
                            {p.adminLevel === "SITE" && <Badge>Site admin</Badge>}
                            {!p.profileCompleted && <Badge variant="outline">Not set up</Badge>}
                          </div>
                          <p className="text-ink-soft truncate text-xs">
                            {[p.email, p.workEmail && p.workEmail !== p.email && p.workEmail]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-72">
                          {p.groups.length === 0 ? (
                            <span className="text-ink-soft">None</span>
                          ) : (
                            <ul className="flex flex-wrap gap-1">
                              {p.groups.map((g) => (
                                <li key={g.id}>
                                  <Badge variant="outline" asChild>
                                    <Link href={`/groups/${g.id}/manage`}>
                                      {g.name}
                                      {g.role === "ADMIN" && " · organiser"}
                                    </Link>
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell>{p.hasWishlist ? "Added" : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.pickUps}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.gifts}</TableCell>
                        <TableCell>
                          {p.id !== me?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Actions for ${p.name ?? p.email ?? "this person"}`}
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      setPending({
                                        kind: "siteAdmin",
                                        person: p,
                                        siteAdmin: p.adminLevel !== "SITE",
                                      })
                                    }
                                  >
                                    {p.adminLevel === "SITE"
                                      ? "Remove site admin"
                                      : "Make a site admin"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setPending({ kind: "delete", person: p })}
                                  >
                                    Delete account
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <nav aria-label="Pages" className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Previous
                </Button>
                <p className="text-ink-soft text-sm tabular-nums">
                  Page {page + 1} of {pages}
                </p>
                <Button
                  variant="outline"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Next
                </Button>
              </nav>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pending.kind === "delete"
                    ? `Delete ${pending.person.name ?? pending.person.email ?? "this account"}?`
                    : pending.siteAdmin
                      ? `Make ${pending.person.name ?? "them"} a site admin?`
                      : `Remove ${pending.person.name ?? "them"} as a site admin?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pending.kind === "delete"
                    ? "Their wishlist, pick-ups, gifts and kudos go too. This can't be undone."
                    : pending.siteAdmin
                      ? "Site admins can approve groups, see everyone and change sign-in options."
                      : "They keep their account and groups, without site admin access."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant={pending.kind === "delete" ? "destructive" : "default"}
                  disabled={setSiteAdmin.isPending || remove.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (pending.kind === "delete") remove.mutate({ userId: pending.person.id });
                    else
                      setSiteAdmin.mutate({
                        userId: pending.person.id,
                        siteAdmin: pending.siteAdmin,
                      });
                  }}
                >
                  {pending.kind === "delete"
                    ? "Delete account"
                    : pending.siteAdmin
                      ? "Make site admin"
                      : "Remove access"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

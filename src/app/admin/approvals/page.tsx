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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

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

/**
 * Site admins: approve new organisations and groups. While the service is
 * free, nothing goes live without this (owner, 18 Oct).
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
          New organisations and groups wait here until you approve them. People
          can join while they wait; gifting opens once they&apos;re live.
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
      </Tabs>

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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={setGroupStatus.isPending}>
                          Close
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Close {g.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Members won&apos;t be able to pick up wishlists in
                            it. You can re-open it later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it open</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              setGroupStatus.mutate({ groupId: g.id, status: "DISABLED" })
                            }
                          >
                            Close group
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
    </div>
  );
}

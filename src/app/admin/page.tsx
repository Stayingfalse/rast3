"use client";

import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

const KIND = {
  ORG: "Workplaces",
  COMMUNITY: "Communities",
  FRIENDS: "Friends groups",
  TEAM: "Teams",
} as const;

const n = (v: number) => v.toLocaleString("en-GB");
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Site admin overview (Day 17): what needs you, the numbers, and health. */
export default function AdminOverviewPage() {
  const { data, error, isLoading } = api.admin.overview.useQuery();

  if (error) return <p className="text-frost">{error.message}</p>;
  if (isLoading || !data) return <p className="text-frost-soft">Loading…</p>;

  const figures = [
    ["People", data.people.users, `${n(data.people.profiles)} finished their profile`],
    ["Wishlists", data.people.wishlists, "people with a wishlist link"],
    ["Joined this week", data.people.joinedThisWeek, "joined a group in 7 days"],
    ["Picked up", data.gifting.pickUps, "wishlists picked up"],
    ["Gifts sent", data.gifting.gifts, `${n(data.gifting.kudos)} kudos posted`],
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle>Needs you</CardTitle>
          <CardDescription>
            New groups wait for approval before gifting opens in them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-4">
            <p className="font-expanded text-ink text-4xl font-extrabold tabular-nums">
              {n(data.waiting)}
            </p>
            <p className="text-ink-soft text-sm">
              {data.waiting === 1 ? "group waiting" : "groups waiting"}
            </p>
            <Button asChild variant={data.waiting ? "default" : "outline"}>
              <Link href="/admin/approvals">Review approvals</Link>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-expanded text-ink text-4xl font-extrabold tabular-nums">
              {n(data.gifting.openReports)}
            </p>
            <p className="text-ink-soft text-sm">wishlist problems reported</p>
            <Button asChild variant="outline">
              <Link href="/admin/links">See wishlists</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <dl className="border-frost/25 text-frost grid grid-cols-2 border-y sm:grid-cols-3 lg:grid-cols-5">
        {figures.map(([label, value, note]) => (
          <div
            key={label}
            className="border-frost/25 flex flex-col gap-1 border-b py-4 pr-4 last:border-b-0 sm:border-b-0"
          >
            <dt className="label-caps text-frost-soft">{label}</dt>
            <dd className="font-expanded text-3xl font-extrabold tabular-nums">
              {n(value)}
            </dd>
            <dd className="text-frost-soft text-sm">{note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>Teams are counted inside their workplace.</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-ink-soft border-rule border-b text-left">
                  <th className="py-2 font-semibold">Kind</th>
                  <th className="py-2 text-right font-semibold">Live</th>
                  <th className="py-2 text-right font-semibold">Waiting</th>
                  <th className="py-2 text-right font-semibold">Closed</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr key={g.kind} className="border-rule border-b last:border-b-0">
                    <td className="py-2">
                      <Link
                        href={`/admin/groups?kind=${g.kind}`}
                        className="text-ink underline underline-offset-4"
                      >
                        {KIND[g.kind]}
                      </Link>
                    </td>
                    <td className="py-2 text-right">{n(g.live)}</td>
                    <td className="py-2 text-right">{n(g.waiting)}</td>
                    <td className="py-2 text-right">{n(g.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
            <CardDescription>This server, right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[8rem_1fr] text-sm">
              {([
                ["Database", <Badge key="db" variant="secondary">Connected</Badge>],
                [
                  "Migrations",
                  data.health.migrations
                    ? `${n(data.health.migrations.applied)} applied, latest ${data.health.migrations.latest ?? "none"}`
                    : "No migration history",
                ],
                [
                  "Schema sync",
                  data.health.schemaSync
                    ? `${data.health.schemaSync.mode ?? "?"}: ${data.health.schemaSync.result ?? "?"}`
                    : "Not recorded",
                ],
                ["Running since", when(data.health.startedAt)],
                ["Environment", data.health.environment],
              ] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k} className="border-rule col-span-2 grid grid-cols-subgrid border-b py-2 last:border-b-0">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="text-ink break-all">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign-in options</CardTitle>
          <CardDescription>
            What people see in the sign-in window.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {data.providers.length === 0 && (
            <p className="text-ink-soft text-sm">None set up yet.</p>
          )}
          {data.providers.map((p) => (
            <Badge key={p.name} variant={p.enabled ? "secondary" : "outline"}>
              {p.displayName}: {p.enabled ? "on" : "off"}
            </Badge>
          ))}
          <Button asChild variant="link" className="ml-auto">
            <Link href="/admin/settings">Change sign-in options</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

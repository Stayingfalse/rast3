"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { api, type RouterOutputs } from "~/trpc/react";

type Insights = RouterOutputs["admin"]["insights"];

const KIND = { ORG: "Workplaces", COMMUNITY: "Communities", FRIENDS: "Friends groups" } as const;

const WEEKLY = [
  ["members", "New members"],
  ["joins", "Group joins"],
  ["groups", "New groups"],
  ["checkIns", "Check-ins"],
  ["pickUps", "Pick-ups"],
  ["gifts", "Gifts"],
  ["arrived", "Arrived"],
  ["thanks", "Thank-yous"],
  ["opens", "Wishlist opens"],
  ["taggedOpens", "Tagged opens"],
] as const;

const n = (x: number) => x.toLocaleString("en-GB");
const pct = (x: number, of: number) => (of > 0 ? `${Math.round((x / of) * 100)}%` : "–");
const ratio = (x: number, of: number) => (of > 0 ? (x / of).toFixed(2) : "–");
const day = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** One CSV for the January decision: funnel, kinds of group, weeks, affiliate. */
function toCsv(d: Insights) {
  const rows: (string | number)[][] = [
    [`Random Acts of Santa insights, Christmas ${d.year}`],
    [],
    ["Funnel", "People", "Of the step before"],
    ...d.funnel.map((f, i) => [
      f.step,
      f.count,
      i && d.funnel[i - 1]!.side === f.side ? pct(f.count, d.funnel[i - 1]!.count) : "",
    ]),
    [],
    ["Kind of group", "Groups live", "Started this season", "Took off", "Members", "Santas", "Pick-ups", "Gifts", "Arrived", "Opens", "Tagged opens"],
    ...d.byKind.map((k) => [KIND[k.kind], k.groupsLive, k.groupsStarted, k.tookOff, k.members, k.santas, k.pickUps, k.gifts, k.arrived, k.opens, k.taggedOpens]),
    [],
    ["Week of", ...WEEKLY.map(([, label]) => label)],
    ...d.weeks.map((w) => [w.week, ...WEEKLY.map(([key]) => w.counts[key] ?? 0)]),
    [],
    ["Affiliate", "Opens", "Tagged", "From gift pages", "Missed (store without an account)"],
    ["", d.affiliate.opens, d.affiliate.tagged, d.affiliate.viaGiftPage, d.affiliate.missed],
  ];
  return rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}

function download(d: Insights) {
  const url = URL.createObjectURL(new Blob([toCsv(d)], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `raosanta-insights-${d.year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Day 27: insights for the 2027 monetisation case. Everything here is counted
 * from what the site already records; nothing extra is tracked about anyone.
 */
export default function AdminInsightsPage() {
  const [season, setSeason] = useState<number | undefined>(undefined);
  const { data, error, isLoading } = api.admin.insights.useQuery({ season });

  if (error) return <p className="text-frost">{error.message}</p>;
  if (isLoading || !data) return <p className="text-frost-soft">Loading…</p>;

  const checkedIn = data.funnel[1]?.count ?? 0;
  const gifts = data.byKind.reduce((s, k) => s + k.gifts, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">
          Insights, Christmas {data.year}
        </h1>
        <p className="text-frost-soft max-w-2xl">
          Who joins, who gives and where, for deciding the 2027 plans. Counted
          from what the site already records: no cookies, no third parties,
          nothing extra tracked about anyone. Gifting {day(data.opensAt)} to{" "}
          {day(data.closesAt)}.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {data.seasons.map((y) => (
            <Button
              key={y}
              variant={y === data.year ? "default" : "secondary"}
              aria-pressed={y === data.year}
              onClick={() => setSeason(y === data.current ? undefined : y)}
            >
              {y}
            </Button>
          ))}
          <Button variant="secondary" onClick={() => download(data)}>
            Download CSV
          </Button>
        </div>
      </div>

      <dl className="border-frost/25 text-frost grid grid-cols-2 border-y sm:grid-cols-4">
        {[
          ["Checked in", checkedIn],
          ["Gifts", gifts],
          ["Arrived", data.byKind.reduce((s, k) => s + k.arrived, 0)],
          ["Tagged opens", data.affiliate.tagged],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 py-4">
            <dt className="label-caps text-frost-soft">{label}</dt>
            <dd className="font-expanded text-3xl font-extrabold tabular-nums">{n(Number(value))}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>The season&apos;s funnel</CardTitle>
          <CardDescription>
            Each step counts only people from the step before. Giving runs from
            members to gifted; receiving from a gift to a thank-you. &ldquo;In a
            group&rdquo; is today&apos;s memberships, so for past seasons
            it&apos;s a rough guide.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">Of the step before</TableHead>
                <TableHead className="text-right">Of checked in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.funnel.map((f, i) => (
                <TableRow
                  key={f.step}
                  className={f.side === "receiving" && data.funnel[i - 1]?.side === "giving" ? "border-t-2 border-t-ink/40" : undefined}
                >
                  <TableCell>
                    <span className="text-ink font-semibold">{f.step}</span>
                    {f.note && <span className="text-ink-soft block text-xs">{f.note}</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{n(f.count)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i === 0 || data.funnel[i - 1]!.side !== f.side ? "" : pct(f.count, data.funnel[i - 1]!.count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i < 2 ? "" : pct(f.count, checkedIn)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By kind of group</CardTitle>
          <CardDescription>
            Where the giving happens, for the Workplace and Community plans.
            Workplace pick-ups include the teams inside them. A group
            &ldquo;took off&rdquo; with 5 or more members in its first 48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Groups live</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Took off</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Santas</TableHead>
                <TableHead className="text-right">Gifts</TableHead>
                <TableHead className="text-right">Gifts per member</TableHead>
                <TableHead className="text-right">Arrived</TableHead>
                <TableHead className="text-right">Tagged opens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byKind.map((k) => (
                <TableRow key={k.kind}>
                  <TableCell className="text-ink font-semibold">{KIND[k.kind]}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.groupsLive)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.groupsStarted)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.tookOff)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.members)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.santas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.gifts)}</TableCell>
                  <TableCell className="text-right tabular-nums">{ratio(k.gifts, k.members)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(k.arrived, k.gifts)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(k.taggedOpens)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Week by week</CardTitle>
          <CardDescription>
            Weeks start on Monday. From a few weeks before gifting opens to
            today, or a week after it closes.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week of</TableHead>
                {WEEKLY.map(([key, label]) => (
                  <TableHead key={key} className="text-right">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.weeks.map((w) => (
                <TableRow key={w.week}>
                  <TableCell className="text-ink font-semibold whitespace-nowrap">{day(w.week)}</TableCell>
                  {WEEKLY.map(([key]) => (
                    <TableCell key={key} className="text-right tabular-nums">
                      {n(w.counts[key] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affiliate links</CardTitle>
          <CardDescription>
            Wishlists opened on Amazon this season. Amazon reports purchases
            and earnings in Associates Central; we only see the opens.
            &ldquo;Missed&rdquo; opens had links on, but their store has no
            Associates account (Affiliate › Wishlist opens has the stores).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Tagged</TableHead>
                <TableHead className="text-right">From gift pages</TableHead>
                <TableHead className="text-right">Missed</TableHead>
                <TableHead className="text-right">Tagged opens per gift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-right tabular-nums">{n(data.affiliate.opens)}</TableCell>
                <TableCell className="text-right tabular-nums">{n(data.affiliate.tagged)}</TableCell>
                <TableCell className="text-right tabular-nums">{n(data.affiliate.viaGiftPage)}</TableCell>
                <TableCell className="text-right tabular-nums">{n(data.affiliate.missed)}</TableCell>
                <TableCell className="text-right tabular-nums">{ratio(data.affiliate.tagged, gifts)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

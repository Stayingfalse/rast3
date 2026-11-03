"use client";

import Link from "next/link";

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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { RouterOutputs } from "~/trpc/react";

type Status = RouterOutputs["admin"]["status"];

const KIND = {
  CHECK_IN_NUDGE: "Check-in reminder",
  SEASON_OPEN: "Gifting is open",
  GIFT_CHECK_IN: "Gift check-in",
  NEW_LISTS: "New wishlists",
} as const;

const PHASE = { before: "Not open yet", open: "Gifting open", after: "Closed" } as const;

const n = (v: number) => v.toLocaleString("en-GB");
const when = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
const hours = (h: number) =>
  h < 1 ? "under an hour" : h < 48 ? `${h} ${h === 1 ? "hour" : "hours"}` : `${Math.floor(h / 24)} days`;

/** State tags: words, never colour alone. */
function Flag({ ok, children }: { ok: boolean; children?: React.ReactNode }) {
  return (
    <span
      className={
        ok
          ? "label-caps bg-label-shade text-ink-soft inline-block rounded-sm px-2 py-1 whitespace-nowrap"
          : "label-caps bg-post-tint text-post-deep inline-block rounded-sm px-2 py-1 whitespace-nowrap"
      }
    >
      {children ?? (ok ? "OK" : "Needs attention")}
    </span>
  );
}

/** A ruled two-column list of facts, as on the overview's Health card. */
function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[10rem_1fr] text-sm">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="border-rule col-span-2 grid grid-cols-subgrid gap-x-3 border-b py-2 last:border-b-0"
        >
          <dt className="text-ink-soft">{k}</dt>
          <dd className="text-ink min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Launch status (2 Nov): one page that shows whether launch is going well or
 * something is stuck, without opening Easypanel. Counts only, test accounts
 * left out. The page around it refreshes it every minute.
 */
export function StatusView({
  data,
  onRefresh,
  refreshing,
}: {
  data: Status;
  onRefresh: () => void;
  refreshing: boolean;
}) {

  const used = data.limit.daily > 0 ? Math.round((data.limit.used / data.limit.daily) * 100) : 0;
  const totals = data.emails.reduce(
    (t, e) => ({ SENT: t.SENT + e.SENT, SKIPPED: t.SKIPPED + e.SKIPPED, FAILED: t.FAILED + e.FAILED }),
    { SENT: 0, SKIPPED: 0, FAILED: 0 },
  );
  const migrationsOk = !!data.health.migrations && !data.health.migrations.failed;
  const syncOk = !["failed", "foreign-history"].includes(data.health.schemaSync?.result ?? "");
  const daysToOpen = Math.ceil((new Date(data.season.opensAt).getTime() - new Date(data.at).getTime()) / 86_400_000);

  const today = [
    ["Picked up today", data.today.pickUps, "wishlists picked up"],
    ["Gifts today", data.today.gifts, "marked as gifted"],
    ["Thank-yous today", data.today.thanks, "thank-you postcards"],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">Launch status</h1>
          <p className="text-frost-soft max-w-2xl">
            Is launch going well, or is something stuck? Counted from what the
            site already records, without test accounts. Updated{" "}
            {when(data.at)}; it refreshes every minute while open.
          </p>
        </div>
        <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="font-expanded text-ink text-lg font-bold">
              {data.attention.length ? "Needs attention" : "Nothing needs attention"}
            </h2>
          </CardTitle>
          <CardDescription>
            Failed emails, groups waiting over a day, no email server, the
            reminder limit nearly used, or migrations that didn&apos;t apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.attention.length === 0 ? (
            <p className="flex items-center gap-3 text-sm">
              <Flag ok />
              <span className="text-ink">All checks look fine right now.</span>
            </p>
          ) : (
            <ul className="text-sm" aria-label="Needs attention">
              {data.attention.map((a) => (
                <li
                  key={a.key}
                  className="border-rule flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2 last:border-b-0"
                >
                  <Flag ok={false} />
                  <span className="text-ink">{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <dl className="border-frost/25 text-frost grid grid-cols-2 border-y sm:grid-cols-4">
        {today.map(([label, value, note]) => (
          <div key={label} className="flex flex-col gap-1 py-4 pr-4">
            <dt className="label-caps text-frost-soft">{label}</dt>
            <dd className="font-expanded text-3xl font-extrabold tabular-nums">{n(value)}</dd>
            <dd className="text-frost-soft text-sm">{note}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 py-4 pr-4">
          <dt className="label-caps text-frost-soft">Christmas {data.season.year}</dt>
          <dd className="font-expanded text-xl font-extrabold sm:pt-2">{PHASE[data.season.phase]}</dd>
          <dd className="text-frost-soft text-sm">
            {data.season.phase === "before"
              ? `Opens ${date(data.season.opensAt)}${daysToOpen > 0 ? `, in ${daysToOpen} ${daysToOpen === 1 ? "day" : "days"}` : ""}`
              : data.season.phase === "open"
                ? `Closes ${date(data.season.closesAt)}`
                : `Closed ${date(data.season.closesAt)}`}
          </dd>
        </div>
      </dl>
      <p className="text-frost-soft -mt-4 text-sm">
        &ldquo;Today&rdquo; is since midnight UK time.{" "}
        <Link href="/admin/season" className="text-frost underline underline-offset-4">
          Change the season&apos;s dates
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="font-expanded text-ink text-lg font-bold">People</h2>
            </CardTitle>
            <CardDescription>
              The site doesn&apos;t record when an account was made, so sign-ups
              are counted by when people finished their profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Counted</TableHead>
                  <TableHead className="text-right">24 h</TableHead>
                  <TableHead className="text-right">7 days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.people.map((p) => (
                  <TableRow key={p.what}>
                    <TableCell>
                      <span className="text-ink font-semibold">{p.what}</span>
                      <span className="text-ink-soft block text-xs">{p.note}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{n(p.day)}</TableCell>
                    <TableCell className="text-right tabular-nums">{n(p.week)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-ink-soft mt-3 text-sm">
              <span className="text-ink font-semibold tabular-nums">{n(data.unfinished)}</span>{" "}
              signed in but haven&apos;t finished their profile yet (any time).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="font-expanded text-ink text-lg font-bold">Groups waiting</h2>
            </CardTitle>
            <CardDescription>
              New groups wait for approval before gifting opens in them.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Facts
              rows={[
                ["Waiting", <span key="w" className="tabular-nums">{n(data.groups.pending)}</span>],
                [
                  "Longest wait",
                  data.groups.oldestHours === null ? (
                    "None waiting"
                  ) : (
                    <span key="o" className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">{hours(data.groups.oldestHours)}</span>
                      <Flag ok={!data.groups.tooLong}>{data.groups.tooLong ? "Over a day" : undefined}</Flag>
                    </span>
                  ),
                ],
              ]}
            />
            <Button asChild variant={data.groups.pending ? "default" : "outline"} className="self-start">
              <Link href="/admin/approvals">Review approvals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="font-expanded text-ink text-lg font-bold">Reminder emails, last 24 hours</h2>
          </CardTitle>
          <CardDescription>
            Skipped emails went to test addresses. A send that fails is logged
            here and tried again at the next hourly run; a run stops after 3
            failures in a row.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.emails.map((e) => (
                  <TableRow key={e.kind}>
                    <TableCell className="text-ink font-semibold">{KIND[e.kind]}</TableCell>
                    <TableCell className="text-right tabular-nums">{n(e.SENT)}</TableCell>
                    <TableCell className="text-right tabular-nums">{n(e.SKIPPED)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.FAILED > 0 ? <Flag ok={false}>{n(e.FAILED)}</Flag> : n(e.FAILED)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-ink font-semibold">All reminders</TableCell>
                  <TableCell className="text-right tabular-nums">{n(totals.SENT)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(totals.SKIPPED)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(totals.FAILED)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <Facts
            rows={[
              [
                "Email server",
                <span key="s" className="flex flex-wrap items-center gap-2">
                  <span>
                    {data.emailServer === "environment"
                      ? "Set in the environment"
                      : data.emailServer === "admin settings"
                        ? "Set in admin settings (Sign-in)"
                        : "None set up"}
                  </span>
                  {data.emailServer === "none" && <Flag ok={false} />}
                </span>,
              ],
              [
                "Daily limit",
                <span key="l" className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">
                    {n(data.limit.used)} of {n(data.limit.daily)} sent in the last 24 h ({used}%)
                  </span>
                  {used >= 80 && <Flag ok={false}>Nearly used</Flag>}
                </span>,
              ],
              [
                "Latest failure",
                data.latestFailed
                  ? `${when(data.latestFailed.at)}: ${data.latestFailed.note ?? "no note"}`
                  : "None logged",
              ],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="font-expanded text-ink text-lg font-bold">App health</h2>
          </CardTitle>
          <CardDescription>This server, right now (the same as /api/health).</CardDescription>
        </CardHeader>
        <CardContent>
          <Facts
            rows={[
              ["Database", <Flag key="db" ok>Connected</Flag>],
              [
                "Migrations",
                <span key="m" className="flex flex-wrap items-center gap-2">
                  <span className="break-all">
                    {data.health.migrations
                      ? `${n(data.health.migrations.applied)} applied, latest ${data.health.migrations.latest ?? "none"}`
                      : "No migration history"}
                  </span>
                  {!migrationsOk && <Flag ok={false} />}
                </span>,
              ],
              [
                "Schema sync",
                <span key="s" className="flex flex-wrap items-center gap-2">
                  <span>
                    {data.health.schemaSync
                      ? `${data.health.schemaSync.mode ?? "?"}: ${data.health.schemaSync.result ?? "?"}`
                      : "Not recorded"}
                  </span>
                  {!syncOk && <Flag ok={false} />}
                </span>,
              ],
              ["Running since", when(data.health.startedAt)],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

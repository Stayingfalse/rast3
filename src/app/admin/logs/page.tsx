"use client";

import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { useDebounced } from "~/lib/use-debounced";
import { api, type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["admin"]["logs"]["entries"][number];
type Level = "INFO" | "WARN" | "ERROR";

const when = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/London",
  });

/**
 * Admin › Logs (owner, 19 Nov): our own log, since the host's log
 * collection is a paid extra. Sign-in email and reminder failures, Auth.js
 * errors with their cause, and test emails. Kept 30 days.
 */
export default function AdminLogsPage() {
  const [level, setLevel] = useState<Level | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const query = useDebounced(q, 300);
  const [pages, setPages] = useState<(string | null)[]>([null]);
  const reset = () => setPages([null]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>
            What went wrong (and the odd thing that went right), newest first. Kept 30 days, with
            email addresses masked and no passwords or keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field className="w-auto">
            <FieldLabel htmlFor="log-level">Level</FieldLabel>
            <select
              id="log-level"
              value={level ?? ""}
              onChange={(e) => {
                setLevel((e.target.value || null) as Level | null);
                reset();
              }}
              className="border-input rounded-label h-9 border bg-white px-3"
            >
              <option value="">All</option>
              <option value="ERROR">Errors</option>
              <option value="WARN">Warnings</option>
              <option value="INFO">Info</option>
            </select>
          </Field>
          <AreaPicker
            area={area}
            onChange={(a) => {
              setArea(a);
              reset();
            }}
          />
          <Field className="w-auto min-w-48 flex-1">
            <FieldLabel htmlFor="log-search">Search</FieldLabel>
            <Input
              id="log-search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                reset();
              }}
              placeholder="Words in the message"
            />
          </Field>
        </CardContent>
      </Card>

      {pages.map((before, i) => (
        <LogPage
          key={`${before ?? "first"}-${level}-${area}-${query}`}
          filters={{ level, area, q: query, before }}
          last={i === pages.length - 1}
          onMore={(next) => setPages((p) => [...p, next])}
        />
      ))}
    </div>
  );
}

function AreaPicker({ area, onChange }: { area: string | null; onChange: (a: string | null) => void }) {
  const { data } = api.admin.logs.useQuery({ level: null, area: null, q: "", before: null });
  return (
    <Field className="w-auto">
      <FieldLabel htmlFor="log-area">About</FieldLabel>
      <select
        id="log-area"
        value={area ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="border-input rounded-label h-9 border bg-white px-3"
      >
        <option value="">Everything</option>
        {data?.areas.map((a) => (
          <option key={a.area} value={a.area}>
            {a.area} ({a.count})
          </option>
        ))}
      </select>
    </Field>
  );
}

function LogPage({
  filters,
  last,
  onMore,
}: {
  filters: { level: Level | null; area: string | null; q: string; before: string | null };
  last: boolean;
  onMore: (next: string) => void;
}) {
  const { data, isLoading, error } = api.admin.logs.useQuery(filters);
  if (error) return <p className="text-frost">{error.message}</p>;
  if (isLoading || !data) return <p className="text-frost-soft">Loading…</p>;
  if (!data.entries.length && !filters.before) {
    return <p className="text-frost-soft">Nothing logged{filters.level || filters.area || filters.q ? " that matches" : " yet"}.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {data.entries.map((e) => (
          <LogEntry key={e.id} e={e} />
        ))}
      </ul>
      {last && data.next && (
        <Button type="button" variant="outline" className="self-start" onClick={() => onMore(data.next!)}>
          Older entries
        </Button>
      )}
    </div>
  );
}

function LogEntry({ e }: { e: Entry }) {
  const variant = e.level === "ERROR" ? "destructive" : e.level === "WARN" ? "secondary" : "outline";
  return (
    <li className="bg-card text-card-foreground rounded-label border p-3">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant={variant}>{e.level}</Badge>
          <span className="text-muted-foreground tabular text-sm whitespace-nowrap">{when(e.createdAt)}</span>
          <span className="text-muted-foreground text-sm">{e.area}</span>
          <span className="min-w-0 flex-1 font-semibold break-words">{e.message}</span>
        </summary>
        {e.detail ? (
          <pre className="bg-muted mt-3 max-h-96 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(e.detail, null, 2)}
          </pre>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">No more detail.</p>
        )}
      </details>
    </li>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

const KIND = { ORG: "Workplace", COMMUNITY: "Community", FRIENDS: "Friends group", TEAM: "Team" } as const;

/** yyyy-mm-dd in UK time, for <input type="date"> */
const ymd = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/London" });

/** Site admins: this Christmas season's dates, check-ins and early groups (Day 18). */
export default function AdminSeasonPage() {
  const utils = api.useUtils();
  const { data, error, isLoading } = api.admin.season.useQuery();
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  useEffect(() => {
    if (!data) return;
    setOpens(ymd(data.opensAt));
    setCloses(ymd(data.closesAt));
  }, [data]);
  const save = api.admin.setSeasonDates.useMutation({
    onSuccess: async () => {
      toast.success("Season dates saved");
      await utils.admin.season.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const close = api.admin.setOpenEarly.useMutation({
    onSuccess: async () => {
      toast.success("Back to the season's dates");
      await utils.admin.season.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (error) return <p className="text-frost">{error.message}</p>;
  if (isLoading || !data) return <p className="text-frost-soft">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">
          Christmas {data.year}
        </h1>
        <p className="text-frost-soft max-w-2xl">
          Members check in once a season (wishlist and groups) before they pick
          up or are picked up. Pick-ups open between the season&apos;s dates,
          or any time in a group you&apos;ve opened early. Gift pages stay live
          whatever the dates.
        </p>
      </div>

      <dl className="border-frost/25 text-frost grid grid-cols-2 border-y sm:grid-cols-3">
        <div className="flex flex-col gap-1 py-4">
          <dt className="label-caps text-frost-soft">Checked in</dt>
          <dd className="font-expanded text-3xl font-extrabold tabular-nums">
            {data.checkedIn.toLocaleString("en-GB")}
          </dd>
          <dd className="text-frost-soft text-sm">
            of {data.members.toLocaleString("en-GB")} members
          </dd>
        </div>
        <div className="flex flex-col gap-1 py-4">
          <dt className="label-caps text-frost-soft">Opens</dt>
          <dd className="font-expanded text-xl font-extrabold">{ymd(data.opensAt)}</dd>
        </div>
        <div className="flex flex-col gap-1 py-4">
          <dt className="label-caps text-frost-soft">Closes</dt>
          <dd className="font-expanded text-xl font-extrabold">{ymd(data.closesAt)}</dd>
        </div>
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Season dates</CardTitle>
          <CardDescription>Gifting opens at midnight and closes at the end of the last day (UK time).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                opensAt: new Date(`${opens}T00:00:00Z`),
                closesAt: new Date(`${closes}T23:59:59Z`),
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="season-opens">Gifting opens</FieldLabel>
                <Input id="season-opens" type="date" value={opens} onChange={(e) => setOpens(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="season-closes">Gifting closes</FieldLabel>
                <Input id="season-closes" type="date" value={closes} onChange={(e) => setCloses(e.target.value)} required />
                <FieldDescription>Pick-ups from earlier seasons are archived automatically.</FieldDescription>
              </Field>
            </div>
            <Button type="submit" className="self-start" disabled={save.isPending}>
              Save dates
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups open early</CardTitle>
          <CardDescription>
            Open a group from its menu on the Groups tab. These can pick up
            outside the season&apos;s dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.openEarly.length === 0 ? (
            <p className="text-ink-soft">None.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.openEarly.map((g) => (
                <li key={g.id} className="border-rule flex items-center justify-between gap-3 border-b pb-2 last:border-b-0">
                  <span className="text-ink">
                    {g.name} <Badge variant="outline">{KIND[g.kind]}</Badge>
                  </span>
                  <Button
                    variant="outline"
                    disabled={close.isPending}
                    onClick={() => close.mutate({ groupId: g.id, open: false })}
                  >
                    Follow season dates
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

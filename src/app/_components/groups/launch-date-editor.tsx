"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ukDateString } from "~/lib/uk-date";
import { api } from "~/trpc/react";

export type Launch = {
  opensAt: Date | string;
  closesAt: Date | string;
  siteOpensAt: Date | string;
  own: boolean;
  open: boolean;
};

const longDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  });
const shortDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

/**
 * A group's gifting launch date (owner, 7 Nov): the site's date (15
 * November) unless its organiser or a site admin picks another day, earlier
 * or later. Organisers can change it until the group opens; site admins any
 * time. Closing is the same for everyone.
 */
export function LaunchDateEditor({
  groupId,
  launch,
  siteAdmin,
  onSaved,
}: {
  groupId: string;
  launch: Launch;
  siteAdmin: boolean;
  onSaved?: () => Promise<unknown> | void;
}) {
  const utils = api.useUtils();
  const [date, setDate] = useState(ukDateString(new Date(launch.opensAt)));
  const save = api.groups.setLaunchDate.useMutation({
    onSuccess: async (r) => {
      toast.success(
        r.open ? "Saved: gifting is open in this group" : `Saved: gifting opens on ${shortDay(r.opensAt)}`,
      );
      setDate(ukDateString(new Date(r.opensAt)));
      await Promise.all([
        utils.groups.manage.invalidate({ groupId }),
        utils.groups.mine.invalidate(),
        utils.season.status.invalidate(),
        onSaved?.(),
      ]);
    },
    onError: (e) => toast.error(e.message),
  });
  const canEdit = siteAdmin || !launch.open;
  const today = ukDateString(new Date());
  // the last day you can pick: the day before gifting closes
  const lastDay = ukDateString(new Date(new Date(launch.closesAt).getTime() - 24 * 3600_000));
  const unchanged = date === ukDateString(new Date(launch.opensAt));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink">
        {launch.open ? "Gifting opened here on " : "Gifting opens here on "}
        <strong>{longDay(launch.opensAt)}</strong>
        {launch.own ? " (this group's own date)" : " (the site's date)"} and closes on{" "}
        {longDay(launch.closesAt)}.
      </p>
      {!canEdit ? (
        <p className="text-ink-soft text-sm">
          Your group is already open. If its date needs to change, ask a site
          admin.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ groupId, date });
          }}
        >
          <Field>
            <FieldLabel htmlFor={`launch-${groupId}`}>Gifting opens on</FieldLabel>
            <Input
              id={`launch-${groupId}`}
              type="date"
              className="max-w-56"
              value={date}
              min={siteAdmin ? undefined : today}
              max={lastDay}
              required
              onChange={(e) => setDate(e.target.value)}
            />
            <FieldDescription>
              Most groups start with everyone else on {shortDay(launch.siteOpensAt)}.
              Joining later, or starting together on a day you&apos;ve agreed?
              Pick it here. Members can pick up wishlists in this group from
              that morning.
            </FieldDescription>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!date || unchanged || save.isPending}>
              Save date
            </Button>
            {launch.own && (
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => save.mutate({ groupId, date: null })}
              >
                Use the site&apos;s date ({shortDay(launch.siteOpensAt)})
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

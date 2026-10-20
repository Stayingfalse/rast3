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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api, type RouterOutputs } from "~/trpc/react";

type Data = RouterOutputs["admin"]["affiliate"];
type Settings = Data["settings"];
type Row = Data["groups"][number];

const KIND = { ORG: "Workplace", COMMUNITY: "Community", FRIENDS: "Friends group", TEAM: "Team" } as const;

function OnOff({
  id,
  value,
  onChange,
}: {
  id: string;
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <Select value={value ? "on" : "off"} onValueChange={(v) => onChange(v === "on")}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="on">On</SelectItem>
          <SelectItem value="off">Off</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Site admins: Amazon affiliate links, site-wide and per group (20 Oct). */
export default function AdminAffiliatePage() {
  const { data, error, isLoading } = api.admin.affiliate.useQuery();

  if (error) return <p className="text-frost">{error.message}</p>;
  if (isLoading || !data) return <p className="text-frost-soft">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-expanded text-frost text-3xl font-extrabold uppercase">
          Affiliate links
        </h1>
        <p className="text-frost-soft max-w-2xl">
          When affiliate links are on for a group, its picked-up wishlists open
          from a public gift page with your Amazon tracking ID and the
          Associates disclosure. When they&apos;re off, wishlists open straight
          on Amazon with no tag. Season {data.season}.
        </p>
      </div>
      <SiteSettings settings={data.settings} />
      <GroupSettings groups={data.groups} defaultTag={data.settings.defaultTag} />
    </div>
  );
}

function SiteSettings({ settings }: { settings: Settings }) {
  const utils = api.useUtils();
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const save = api.admin.setAffiliateSettings.useMutation({
    onSuccess: async () => {
      toast.success("Affiliate settings saved");
      await utils.admin.affiliate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const set = (patch: Partial<Settings>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site settings</CardTitle>
        <CardDescription>
          The master switch turns everything off at once. Groups left on
          &ldquo;Site default&rdquo; follow the default for their kind.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="aff-enabled">Affiliate links (master switch)</FieldLabel>
              <OnOff id="aff-enabled" value={form.enabled} onChange={(enabled) => set({ enabled })} />
            </Field>
            <Field className="lg:col-span-2">
              <FieldLabel htmlFor="aff-tag">Default tracking ID</FieldLabel>
              <Input
                id="aff-tag"
                value={form.defaultTag}
                onChange={(e) => set({ defaultTag: e.target.value })}
              />
              <FieldDescription>Used by any group without its own ID this season.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="aff-org">Workplaces by default</FieldLabel>
              <OnOff id="aff-org" value={form.orgDefault} onChange={(orgDefault) => set({ orgDefault })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="aff-community">Communities by default</FieldLabel>
              <OnOff
                id="aff-community"
                value={form.communityDefault}
                onChange={(communityDefault) => set({ communityDefault })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="aff-friends">Friends groups by default</FieldLabel>
              <OnOff
                id="aff-friends"
                value={form.friendsDefault}
                onChange={(friendsDefault) => set({ friendsDefault })}
              />
            </Field>
          </div>
          <Button type="submit" className="self-start" disabled={save.isPending}>
            Save settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function GroupSettings({ groups, defaultTag }: { groups: Row[]; defaultTag: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups</CardTitle>
        <CardDescription>
          Force a group on or off, and give it its own tracking ID for this
          season. Create tracking IDs in Associates Central first.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Setting</TableHead>
              <TableHead>Tracking ID this season</TableHead>
              <TableHead>Now</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Save</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <GroupRow key={g.id} group={g} defaultTag={defaultTag} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GroupRow({ group, defaultTag }: { group: Row; defaultTag: string }) {
  const utils = api.useUtils();
  const [mode, setMode] = useState(group.affiliate);
  const [tag, setTag] = useState(group.tag ?? "");
  useEffect(() => {
    setMode(group.affiliate);
    setTag(group.tag ?? "");
  }, [group.affiliate, group.tag]);
  const save = api.admin.setGroupAffiliate.useMutation({
    onSuccess: async () => {
      toast.success(`${group.name} saved`);
      await utils.admin.affiliate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const changed = mode !== group.affiliate || tag.trim() !== (group.tag ?? "");

  return (
    <TableRow>
      <TableCell className="max-w-56">
        <p className="text-ink truncate font-semibold">{group.name}</p>
        <p className="text-ink-soft text-xs">
          {KIND[group.kind]} · {group.members} {group.members === 1 ? "member" : "members"}
        </p>
      </TableCell>
      <TableCell className="min-w-40">
        <Select value={mode} onValueChange={(v) => setMode(v as Row["affiliate"])}>
          <SelectTrigger className="w-full" aria-label={`Affiliate setting for ${group.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="DEFAULT">Site default</SelectItem>
              <SelectItem value="ON">On</SelectItem>
              <SelectItem value="OFF">Off</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-48">
        <Input
          aria-label={`Tracking ID for ${group.name}`}
          placeholder={defaultTag}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
      </TableCell>
      <TableCell>
        {group.active ? (
          <Badge variant="secondary">On · {group.activeTag}</Badge>
        ) : (
          <Badge variant="outline">Off</Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          disabled={!changed || save.isPending}
          onClick={() =>
            save.mutate({ groupId: group.id, mode, tag: tag.trim() || null })
          }
        >
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

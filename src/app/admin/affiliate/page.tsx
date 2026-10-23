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
type Pool = Data["pool"];
const DEFAULT = "__default";

type Defaults = { uk: string; us: string };
const defaults = (s: Settings): Defaults => ({ uk: s.defaultTag, us: s.defaultTagUs });
const isDefault = (tag: string, d: Defaults) => tag === d.uk || tag === d.us;

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
      <GroupSettings groups={data.groups} pool={data.pool} defaults={defaults(data.settings)} />
      <TrackingIdPool pool={data.pool} defaults={defaults(data.settings)} />
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
            <Field>
              <FieldLabel htmlFor="aff-tag">Default ID, Amazon.co.uk</FieldLabel>
              <Input
                id="aff-tag"
                value={form.defaultTag}
                onChange={(e) => set({ defaultTag: e.target.value })}
              />
              <FieldDescription>For UK lists in groups without their own ID. Ends in -21.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="aff-tag-us">Default ID, Amazon.com</FieldLabel>
              <Input
                id="aff-tag-us"
                value={form.defaultTagUs}
                onChange={(e) => set({ defaultTagUs: e.target.value })}
              />
              <FieldDescription>For US lists in groups without their own ID. Ends in -20.</FieldDescription>
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

function GroupSettings({
  groups,
  pool,
  defaults,
}: {
  groups: Row[];
  pool: Pool;
  defaults: Defaults;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups</CardTitle>
        <CardDescription>
          Force a group on or off, and give it the pool&apos;s tracking IDs
          for this season (one for Amazon.co.uk, one for Amazon.com) so its
          earnings show separately in Associates Central. Lists on other
          Amazon stores open untagged.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Setting</TableHead>
              <TableHead>UK ID this season</TableHead>
              <TableHead>US ID this season</TableHead>
              <TableHead>Now</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Save</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <GroupRow key={g.id} group={g} pool={pool} defaults={defaults} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** One store's tracking ID for a group: the default, or a free pool ID. */
function TagSelect({
  value,
  onChange,
  choices,
  fallback,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  choices: Pool;
  fallback: string;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={DEFAULT}>Default ({fallback})</SelectItem>
          {choices.map((p) => (
            <SelectItem key={p.tag} value={p.tag}>
              {p.tag}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function GroupRow({
  group,
  pool,
  defaults,
}: {
  group: Row;
  pool: Pool;
  defaults: Defaults;
}) {
  const utils = api.useUtils();
  const [mode, setMode] = useState(group.affiliate);
  const [tag, setTag] = useState(group.tag ?? DEFAULT);
  const [tagUs, setTagUs] = useState(group.tagUs ?? DEFAULT);
  useEffect(() => {
    setMode(group.affiliate);
    setTag(group.tag ?? DEFAULT);
    setTagUs(group.tagUs ?? DEFAULT);
  }, [group.affiliate, group.tag, group.tagUs]);
  // free IDs for each store, plus the ones this group already has
  const free = (store: "uk" | "us") =>
    pool.filter(
      (p) => p.store === store && !isDefault(p.tag, defaults) && (!p.usedBy || p.usedBy.id === group.id),
    );
  const save = api.admin.setGroupAffiliate.useMutation({
    onSuccess: async () => {
      toast.success(`${group.name} saved`);
      await utils.admin.affiliate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const changed =
    mode !== group.affiliate || tag !== (group.tag ?? DEFAULT) || tagUs !== (group.tagUs ?? DEFAULT);

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
      <TableCell className="min-w-44">
        <TagSelect
          value={tag}
          onChange={setTag}
          choices={free("uk")}
          fallback={defaults.uk}
          label={`UK tracking ID for ${group.name}`}
        />
      </TableCell>
      <TableCell className="min-w-44">
        <TagSelect
          value={tagUs}
          onChange={setTagUs}
          choices={free("us")}
          fallback={defaults.us}
          label={`US tracking ID for ${group.name}`}
        />
      </TableCell>
      <TableCell>
        {group.active ? (
          <Badge variant="secondary">
            On · {group.activeTags?.uk} · {group.activeTags?.us}
          </Badge>
        ) : (
          <Badge variant="outline">Off</Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          disabled={!changed || save.isPending}
          onClick={() =>
            save.mutate({
              groupId: group.id,
              mode,
              tag: tag === DEFAULT ? null : tag,
              tagUs: tagUs === DEFAULT ? null : tagUs,
            })
          }
        >
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

function TrackingIdPool({ pool, defaults }: { pool: Pool; defaults: Defaults }) {
  const utils = api.useUtils();
  const [text, setText] = useState("");
  const done = async (message: string) => {
    toast.success(message);
    await utils.admin.affiliate.invalidate();
  };
  const add = api.admin.addTrackingIds.useMutation({
    onSuccess: async (r) => {
      setText("");
      await done(`${r.added} added to the pool`);
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = api.admin.removeTrackingId.useMutation({
    onSuccess: () => done("Removed from the pool"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracking ID pool</CardTitle>
        <CardDescription>
          Tracking IDs you&apos;ve created in Associates Central: -21 for
          Amazon.co.uk, -20 for Amazon.com. Each one can go to one group per
          season.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-wrap gap-2">
          {pool.map((p) => (
            <li key={p.tag} className="border-rule flex items-center gap-2 rounded-label border py-1 pr-1 pl-3 text-sm">
              <span className="text-ink font-semibold tabular-nums">{p.tag}</span>
              <span className="text-ink-soft">
                {p.store === "us" ? "US" : "UK"} ·{" "}
                {isDefault(p.tag, defaults) ? "Default" : p.usedBy ? p.usedBy.name : "Free"}
              </span>
              {!p.usedBy && !isDefault(p.tag, defaults) && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${p.tag} from the pool`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ tag: p.tag })}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const tags = text.split(/[\s,]+/).filter(Boolean);
            if (tags.length) add.mutate({ tags });
          }}
        >
          <Field>
            <FieldLabel htmlFor="aff-pool-add">Add tracking IDs</FieldLabel>
            <textarea
              id="aff-pool-add"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="raosanta13-21 or raosanta10-20"
              className="border-input rounded-label bg-background text-ink w-full border px-3 py-2"
            />
            <FieldDescription>One per line, or separated by commas.</FieldDescription>
          </Field>
          <Button type="submit" variant="outline" className="self-start" disabled={add.isPending}>
            Add to pool
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

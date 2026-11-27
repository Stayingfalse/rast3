"use client";

import { Field, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

export const ALL_GROUPS = "all";
const KINDS = [
  ["ORG", "Workplaces"],
  ["TEAM", "Teams"],
  ["COMMUNITY", "Communities"],
  ["FRIENDS", "Friends groups"],
] as const;

/** Filter an admin page by any group: workplaces, teams, communities, friends groups (27 Nov). */
export function GroupFilter({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const { data: groups } = api.admin.wishlistGroups.useQuery();
  return (
    <Field>
      <FieldLabel htmlFor={id}>Group</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL_GROUPS}>All groups</SelectItem>
          </SelectGroup>
          {KINDS.map(([k, label]) => {
            const inKind = groups?.filter((g) => g.kind === k) ?? [];
            if (!inKind.length) return null;
            return (
              <SelectGroup key={k}>
                <SelectSeparator />
                <SelectLabel>{label}</SelectLabel>
                {inKind.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label} <span className="text-ink-soft tabular-nums">({g.members})</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </Field>
  );
}

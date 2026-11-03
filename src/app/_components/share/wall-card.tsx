"use client";

import Link from "next/link";
import { useState } from "react";

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
import { ShareSheet, type ShareRequest } from "./share-sheet";

/**
 * Day 34, organiser console: make and share the group's Wall of Kindness.
 * Its thank-yous on one page and image, under festive names.
 */
export function WallCard({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const { data: wall } = api.share.wall.useQuery({ groupId });
  const [label, setLabel] = useState<string | null>(null);
  const [request, setRequest] = useState<ShareRequest | null>(null);
  const utils = api.useUtils();
  if (!wall) return null;

  const name = label ?? wall.label ?? groupName.slice(0, 40);
  const short = Math.max(wall.min - wall.thanks, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wall of Kindness</CardTitle>
        <CardDescription>
          Your group&apos;s thank-yous on one page and one picture, under
          festive names: no real names, no gifts, no photos. Post it on
          Discord, Slack or LinkedIn; it stays live all season, so share it
          again as your recap.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="wall-label">Name on the wall</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input
              id="wall-label"
              value={name}
              maxLength={40}
              onChange={(e) => setLabel(e.target.value)}
              className="sm:max-w-sm"
            />
            <Button
              type="button"
              disabled={!wall.ready || !name.trim()}
              onClick={() =>
                setRequest({ kind: "wall", groupId, label: name.trim() })
              }
            >
              {wall.path ? "Share the wall" : "Make the wall"}
            </Button>
            {wall.path && wall.ready && (
              <Button asChild variant="outline">
                <Link href={wall.path} target="_blank">
                  Open the wall
                </Link>
              </Button>
            )}
          </div>
          <FieldDescription>
            {!wall.live
              ? "Your wall opens once we've approved the group."
              : wall.ready
                ? `${wall.thanks} thank-yous this season.`
                : `Your wall opens at ${wall.min} thank-yous this season: ${short} to go.`}
          </FieldDescription>
        </Field>
      </CardContent>
      <ShareSheet
        request={request}
        onClose={() => {
          setRequest(null);
          void utils.share.wall.invalidate({ groupId });
        }}
      />
    </Card>
  );
}

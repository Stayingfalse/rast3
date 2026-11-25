"use client";

import { DownloadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { BANNER_SIZES, type BannerSize } from "~/lib/banner-sizes";

/**
 * Promotional banners for the group (owner, 17 Nov): ready-made images with
 * the group's join link, in the standard web sizes, to post on the intranet,
 * a website, a newsletter or social media.
 */
export function BannersCard({ groupId, people }: { groupId: string; people: string }) {
  const src = (size: BannerSize, download = false) =>
    `/groups/${groupId}/banners/${size}${download ? "?download=1" : ""}`;
  const sizes = Object.entries(BANNER_SIZES) as [BannerSize, (typeof BANNER_SIZES)[BannerSize]][];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Banners</CardTitle>
        <CardDescription>
          Ready-made images with your join link, to put in front of your {people}: the
          intranet, a newsletter, a website or a social post. They update themselves
          with your group&apos;s dates.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="grid gap-6 sm:grid-cols-2">
          {sizes.map(([size, s]) => (
            <li key={size} className={`flex flex-col gap-2 ${size === "1200x628" ? "sm:col-span-2" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed-in image route, not for the optimiser */}
              <img
                src={src(size)}
                alt={`${s.width} by ${s.height} banner with your join link`}
                width={s.width}
                height={s.height}
                loading="lazy"
                className="rounded-label border-rule bg-night h-auto max-w-full self-start border"
                style={{ width: Math.min(s.width, size === "1200x628" ? 960 : s.width) }}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold">
                  {s.width} × {s.height}
                </span>
                <span className="text-muted-foreground text-sm">{s.use}</span>
                <Button asChild variant="outline" size="sm" className="ml-auto">
                  <a href={src(size, true)} download>
                    <DownloadIcon aria-hidden />
                    Download {s.width} × {s.height}
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

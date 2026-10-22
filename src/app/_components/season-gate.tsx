"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { amazonWishlistRegex, WISHLIST_HINT } from "~/lib/wishlist";
import { api, type RouterOutputs } from "~/trpc/react";

type Status = RouterOutputs["season"]["status"];

const KIND = { ORG: "Workplace", COMMUNITY: "Community", FRIENDS: "Friends group", TEAM: "Team" } as const;

const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });

/**
 * Day 18: the season around the gifting area. Members check in once a
 * season (wishlist and groups) before they can pick up or be picked up, and
 * see a countdown until gifting opens.
 */
export function SeasonGate({ children }: { children: React.ReactNode }) {
  const { data } = api.season.status.useQuery();
  if (!data) return null;
  // first-time members set up their profile first (that counts as checking in)
  if (!data.profileCompleted) return <>{children}</>;
  if (!data.checkedIn) return <CheckInCard status={data} />;
  return (
    <>
      {!data.openNow && <Countdown status={data} />}
      {children}
    </>
  );
}

function Countdown({ status }: { status: Status }) {
  const days = Math.max(0, Math.ceil((new Date(status.opensAt).getTime() - Date.now()) / 86_400_000));
  return (
    <p
      role="status"
      className="rounded-label border-gold/50 text-gold-soft w-full border px-4 py-3"
    >
      {status.phase === "before" ? (
        <>
          <strong className="text-frost">Gifting opens on {longDate(status.opensAt)}</strong>
          {days > 0 && <> ({days} {days === 1 ? "day" : "days"} to go)</>}. You&apos;re checked in
          and your wishlist is ready; pick-ups start then.
        </>
      ) : (
        <>
          <strong className="text-frost">Christmas {status.season} has closed.</strong> Thank you,
          Santa! Random Acts of Santa opens again in November.
        </>
      )}
    </p>
  );
}

function CheckInCard({ status }: { status: Status }) {
  const utils = api.useUtils();
  const [mode, setMode] = useState<"keep" | "new">(status.wishlistUrl ? "keep" : "new");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const checkIn = api.season.checkIn.useMutation({
    onSuccess: async () => {
      toast.success(`You're checked in for Christmas ${status.season}`);
      await Promise.all([
        utils.season.status.invalidate(),
        utils.profile.getCurrentProfile.invalidate(),
      ]);
    },
    onError: (e) => setError(e.message),
  });

  return (
    <section
      aria-labelledby="check-in-heading"
      className="label-stock relative w-full overflow-hidden"
    >
      <div className="airmail h-2.5" aria-hidden />
      <form
        className="flex flex-col gap-6 p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (mode === "new" && !amazonWishlistRegex.test(url.trim())) {
            setError(WISHLIST_HINT);
            return;
          }
          checkIn.mutate(mode === "new" ? { amazonWishlistUrl: url.trim() } : {});
        }}
      >
        <div className="flex flex-col gap-2">
          <p className="label-caps text-ink-soft">Christmas {status.season} check-in</p>
          <h2
            id="check-in-heading"
            className="font-expanded text-ink text-2xl leading-tight font-extrabold sm:text-3xl"
          >
            Ready for Christmas {status.season}?
          </h2>
          <p className="text-ink-soft max-w-2xl">
            Before you pick up wishlists, or anyone picks up yours, check your
            wishlist and groups are up to date. Gifting opens on{" "}
            {longDate(status.opensAt)}.
          </p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="label-caps text-ink mb-2">Your wishlist</legend>
          {status.wishlistUrl && (
            <label className="border-rule rounded-label flex min-h-11 cursor-pointer items-start gap-3 border bg-white px-4 py-3">
              <input
                type="radio"
                name="wishlist"
                className="accent-post mt-1 size-4"
                checked={mode === "keep"}
                onChange={() => setMode("keep")}
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-ink font-semibold">Keep my wishlist from last time</span>
                <a
                  href={status.wishlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-post truncate text-sm underline underline-offset-4"
                >
                  Check it on Amazon
                </a>
              </span>
            </label>
          )}
          <label className="border-rule rounded-label flex min-h-11 cursor-pointer items-start gap-3 border bg-white px-4 py-3">
            <input
              type="radio"
              name="wishlist"
              className="accent-post mt-1 size-4"
              checked={mode === "new"}
              onChange={() => setMode("new")}
            />
            <span className="text-ink font-semibold">Use a different wishlist</span>
          </label>
          {mode === "new" && (
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="check-in-url">Amazon UK wishlist link</FieldLabel>
              <Input
                id="check-in-url"
                type="url"
                inputMode="url"
                placeholder="https://www.amazon.co.uk/hz/wishlist/ls/…"
                value={url}
                aria-invalid={!!error || undefined}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <FieldDescription>
                Make sure the list is public or shared, with your gift address set.
                Add things at a range of prices, so every Santa finds something.
              </FieldDescription>
            </Field>
          )}
          {error && <FieldError>{error}</FieldError>}
        </fieldset>

        <div className="flex flex-col gap-3">
          <p className="label-caps text-ink">Your groups</p>
          {status.groups.length === 0 ? (
            <p className="text-ink-soft">
              You&apos;re not in a group yet. Join one so you can gift this year.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {status.groups.map((g) => (
                <li
                  key={g.id}
                  className="border-rule text-ink rounded-label border px-3 py-1.5 text-sm"
                >
                  {g.name} <span className="text-ink-soft">· {KIND[g.kind]}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/groups" className="text-post self-start text-sm underline underline-offset-4">
            Change your groups
          </Link>
        </div>

        <Button type="submit" className="self-start" disabled={checkIn.isPending}>
          {checkIn.isPending ? "Checking in…" : `Check in for ${status.season}`}
        </Button>
      </form>
    </section>
  );
}

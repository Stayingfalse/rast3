"use client";

import { useEffect, useState } from "react";

import { api } from "~/trpc/react";
import { GroupHome } from "./group-home";

/** Where you're gifting (a group id, or "workplace"), remembered per browser */
export const GIFTING_IN_KEY = "raos-gifting-in";
/** Fired when it changes, so the thank-you feed can follow (Day 26) */
export const GIFTING_IN_EVENT = "raos-gifting-in";
const KEY = GIFTING_IN_KEY;
const WORKPLACE = "workplace";

/**
 * Day 14: choose where you're gifting: your workplace (children) or one of
 * your friends or community groups. Remembers the last choice per browser.
 */
export function GiftingSwitcher({ children }: { children: React.ReactNode }) {
  const { data: groups } = api.groups.mine.useQuery();
  const { data: profile } = api.profile.getCurrentProfile.useQuery();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelected(window.localStorage.getItem(KEY));
    } catch {
      // storage unavailable (private mode): fall back to the default
    }
  }, []);

  if (!groups?.length) return <>{children}</>;

  const hasWorkplace = !!profile?.workplace;
  const tabs = [
    ...(hasWorkplace ? [{ id: WORKPLACE, label: "Workplace" }] : []),
    ...groups.map((g) => ({ id: g.id, label: g.name })),
  ];
  const current =
    tabs.find((t) => t.id === selected)?.id ?? tabs[0]?.id ?? WORKPLACE;
  const choose = (id: string) => {
    setSelected(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(GIFTING_IN_EVENT, { detail: id }));
  };
  const group = groups.find((g) => g.id === current);

  return (
    <div className="flex w-full flex-col gap-8">
      <div
        role="tablist"
        aria-label="Gifting in"
        className="border-frost/25 -mx-1 flex gap-1 overflow-x-auto border-b pb-px"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === current}
            onClick={() => choose(t.id)}
            className={`min-h-11 shrink-0 rounded-t-md px-4 py-2 text-sm font-semibold whitespace-nowrap ${
              t.id === current
                ? "bg-label text-ink"
                : "text-frost-soft hover:text-frost"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        aria-label={tabs.find((t) => t.id === current)?.label}
      >
        {group ? <GroupHome group={group} /> : children}
      </div>
    </div>
  );
}

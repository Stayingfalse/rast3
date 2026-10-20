"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/users", label: "People" },
  { href: "/admin/links", label: "Wishlists" },
  { href: "/admin/kudos", label: "Kudos" },
  { href: "/admin/affiliate", label: "Affiliate" },
  { href: "/admin/settings", label: "Sign-in" },
] as const;

/** Site admin console frame (Day 17): a ruled tab bar over the page. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-expanded text-frost text-2xl font-extrabold uppercase sm:text-3xl">
            Site admin
          </p>
          <Link
            href="/"
            className="text-frost-soft text-sm underline underline-offset-4"
          >
            Back to the site
          </Link>
        </div>
        <nav
          aria-label="Site admin"
          className="border-frost/25 -mx-4 overflow-x-auto border-y px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex min-w-max gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "label-caps flex h-11 items-center border-b-2 px-3",
                      active
                        ? "border-gold text-frost"
                        : "text-frost-soft hover:text-frost border-transparent",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      {children}
    </div>
  );
}

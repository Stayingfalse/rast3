"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * Site admins only (Day 17). Organisers reach their own console from the
 * group or workplace card instead.
 */
export default function AdminButton() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || session?.user?.adminLevel !== "SITE") return null;

  return (
    <Link
      href="/admin"
      className="btn-quiet bg-night text-frost fixed top-4 right-4 z-40 sm:right-6"
    >
      Site admin
    </Link>
  );
}

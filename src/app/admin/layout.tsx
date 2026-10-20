import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { AdminShell } from "./_components/admin-shell";

export const metadata: Metadata = {
  title: "Site admin · Random Acts of Santa",
  robots: { index: false },
};

/**
 * Server-side gate for every /admin page: site admins only (Day 17). An
 * organiser who lands here is sent to their own console; everyone else gets
 * the ordinary 404. The tRPC procedures enforce access themselves.
 */
export default async function AdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { adminLevel: true },
  });
  if (user?.adminLevel !== "SITE") {
    const organiser = await db.membership.findFirst({
      where: {
        userId: session.user.id,
        role: "ADMIN",
        group: { kind: { not: "TEAM" } },
      },
      orderBy: { joinedAt: "asc" },
      select: { groupId: true },
    });
    if (organiser) redirect(`/groups/${organiser.groupId}/manage`);
    notFound();
  }
  return <AdminShell>{children}</AdminShell>;
}

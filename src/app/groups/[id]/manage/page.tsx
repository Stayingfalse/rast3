import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganiserConsole } from "~/app/_components/groups/organiser-console";
import { TeamConsole } from "~/app/_components/groups/team-console";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const metadata: Metadata = {
  title: "Manage group · Random Acts of Santa",
  robots: { index: false },
};

/**
 * Day 16: organiser console (access is checked by groups.manage); a team's
 * page for its leads (7 Nov; checked by groups.team).
 */
export default async function ManageGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();
  const { id } = await params;
  const group = await db.group.findUnique({ where: { id }, select: { kind: true } });
  if (group?.kind === "TEAM") return <TeamConsole teamId={id} />;
  return <OrganiserConsole groupId={id} />;
}

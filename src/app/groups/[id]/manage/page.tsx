import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganiserConsole } from "~/app/_components/groups/organiser-console";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Manage group · Random Acts of Santa",
  robots: { index: false },
};

/** Day 16: organiser console (access is checked by groups.manage). */
export default async function ManageGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();
  const { id } = await params;
  return <OrganiserConsole groupId={id} />;
}

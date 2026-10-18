import { notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * Server-side gate for every /admin page. The tRPC procedures enforce scope
 * themselves; this just means members and visitors never get the admin
 * screens at all (they see the ordinary 404).
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
  if (!user || user.adminLevel === "USER") notFound();
  return children;
}

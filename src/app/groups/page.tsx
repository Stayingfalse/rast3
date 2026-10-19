import type { Metadata } from "next";

import { GroupsPanel } from "~/app/_components/groups/groups-panel";
import { JoinButton } from "~/app/_components/post/join-button";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Your groups · Random Acts of Santa",
  robots: { index: false },
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  const { welcome } = await searchParams;
  if (!session?.user) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-start gap-4">
        <h1 className="font-expanded text-frost text-4xl font-extrabold uppercase">
          Your groups
        </h1>
        <p className="text-frost-soft text-lg">
          Sign in to start a group for friends or a community, or to join one
          with an invite code.
        </p>
        <JoinButton label="Sign in" />
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      {welcome && (
        <p
          role="status"
          className="rounded-label border-gold/50 text-gold-soft border px-4 py-3"
        >
          Profile saved. Now join your workplace or a group, or start one, and
          you&apos;re ready to gift.
        </p>
      )}
      <GroupsPanel />
    </div>
  );
}

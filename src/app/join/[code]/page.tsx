import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinGroupButton } from "~/app/_components/groups/join-group-button";
import { JoinButton } from "~/app/_components/post/join-button";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { findInvite, formatJoinCode } from "~/server/invites";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const invite = await findInvite((await params).code);
  const title = invite
    ? `Join ${invite.name} on Random Acts of Santa`
    : "Random Acts of Santa";
  return {
    title,
    description:
      "Swap Christmas gifts through each other's wishlists: no draw, no addresses.",
    robots: { index: false, follow: false },
    openGraph: { title },
  };
}

/** Invite landing page for friends and community groups. */
export default async function JoinPage({ params }: Props) {
  const invite = await findInvite((await params).code);
  if (!invite) notFound();

  const session = await auth();
  const alreadyIn = session?.user?.id
    ? !!(await db.membership.findUnique({
        where: {
          groupId_userId: { groupId: invite.id, userId: session.user.id },
        },
        select: { id: true },
      }))
    : false;

  return (
    <article className="label-stock text-ink flex w-full max-w-xl flex-col overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-5 p-6 sm:p-10">
        <p className="label-caps text-ink-soft">
          You&apos;re invited to a{" "}
          {invite.kind === "FRIENDS" ? "friends group" : "community group"}
        </p>
        <h1 className="font-expanded text-ink text-4xl leading-none font-extrabold">
          {invite.name}
        </h1>
        <p className="text-ink-soft">
          {invite.members} {invite.members === 1 ? "member" : "members"} · code{" "}
          <span className="font-expanded text-post font-bold tracking-widest">
            {formatJoinCode(invite.joinCode)}
          </span>
        </p>
        <p className="text-lg leading-relaxed">
          Random Acts of Santa is Christmas gifting without the draw: share your
          Amazon wishlist, pick up a few of the group&apos;s whenever you&apos;re
          ready, and gift what you like. Nobody ever sees an address.
        </p>
        {invite.status === "PENDING" && (
          <p
            role="status"
            className="bg-gold-soft/40 border-gold rounded-label border px-3 py-2 text-sm"
          >
            This group is new and waiting for our approval. You can join now;
            gifting opens once it&apos;s approved.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {alreadyIn ? (
            <>
              <p className="font-semibold">You&apos;re already in this group.</p>
              <Link href="/groups" className="btn-post">
                Your groups
              </Link>
            </>
          ) : session?.user ? (
            <JoinGroupButton code={invite.joinCode} name={invite.name} />
          ) : (
            <>
              <JoinButton label="Sign in to join" />
              <p className="text-ink-soft text-sm">
                New here? Signing in creates your account.
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

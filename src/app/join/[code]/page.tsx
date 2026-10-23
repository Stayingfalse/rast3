import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InviteFlow } from "~/app/_components/invite/invite-flow";
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

/**
 * Invite landing page for friends and community groups (owner, 23 Oct:
 * each kind has its own way in). A community linked to a Discord server is
 * joined through Discord only; friends groups (and unlinked communities)
 * are joined straight from the code. The invite carries through sign-in
 * and the profile.
 */
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
  const viaDiscord = !!invite.discordGuildId;

  return (
    <article className="label-stock text-ink flex w-full max-w-xl flex-col overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-5 p-6 sm:p-10">
        <h1 className="font-expanded text-ink text-4xl leading-none font-extrabold">
          {invite.name}
        </h1>
        <p className="text-ink-soft">
          {viaDiscord ? "Discord community" : invite.kind === "FRIENDS" ? "Friends group" : "Community group"} ·{" "}
          {invite.members} {invite.members === 1 ? "member" : "members"}
          {!viaDiscord && (
            <>
              {" "}
              · code{" "}
              <span className="font-expanded text-post font-bold tracking-widest">
                {formatJoinCode(invite.joinCode)}
              </span>
            </>
          )}
        </p>
        <p className="text-lg leading-relaxed">
          {viaDiscord
            ? "Your server is doing Christmas presents: share your Amazon wishlist, pick up other members' whenever you're ready, and send something anonymously. Nobody ever sees an address."
            : "Random Acts of Santa is Christmas gifting without the draw: share your Amazon wishlist, pick up a few of the group's whenever you're ready, and gift what you like. Nobody ever sees an address."}
        </p>
        {invite.status === "PENDING" && !alreadyIn && (
          <p
            role="status"
            className="bg-gold-soft/40 border-gold rounded-label border px-3 py-2 text-sm"
          >
            This group is new and waiting for our approval. You can join now;
            gifting opens once it&apos;s approved.
          </p>
        )}
        <InviteFlow
          kind={viaDiscord ? "discord" : "friends"}
          group={{ id: invite.id, name: invite.name, status: invite.status, members: invite.members }}
          code={invite.joinCode}
          signedIn={!!session?.user}
          alreadyIn={alreadyIn}
        />
      </div>
    </article>
  );
}

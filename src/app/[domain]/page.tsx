import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InviteFlow } from "~/app/_components/invite/invite-flow";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * A workplace's own invite link (owner, 23 Oct 2026): raosanta.uk/acme.co.uk.
 * Anything that isn't a live organisation's email domain is the usual 404.
 */
type Props = {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ code?: string }>;
};

const DOMAIN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

async function findWorkplace(raw: string) {
  const domain = decodeURIComponent(raw).trim().toLowerCase();
  if (!DOMAIN.test(domain)) return null;
  const org = await db.group.findUnique({
    where: { emailDomain: domain },
    select: {
      id: true,
      name: true,
      kind: true,
      status: true,
      joinCode: true,
      _count: { select: { memberships: true } },
    },
  });
  if (org?.kind !== "ORG" || org.status === "DISABLED") return null;
  return { ...org, domain };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await findWorkplace((await params).domain);
  if (!org) return { title: "Random Acts of Santa" };
  const title = `${org.name} on Random Acts of Santa`;
  return {
    title,
    description: "Anonymous Christmas gifts between colleagues: no draw, no addresses.",
    robots: { index: false, follow: false },
    openGraph: { title },
  };
}

export default async function WorkplaceInvitePage({ params, searchParams }: Props) {
  const org = await findWorkplace((await params).domain);
  if (!org) notFound();
  const { code } = await searchParams;

  const session = await auth();
  const alreadyIn = session?.user?.id
    ? !!(await db.membership.findUnique({
        where: { groupId_userId: { groupId: org.id, userId: session.user.id } },
        select: { id: true },
      }))
    : false;

  return (
    <article className="label-stock text-ink flex w-full max-w-xl flex-col overflow-hidden">
      <div className="airmail h-2.5" aria-hidden />
      <div className="flex flex-col gap-5 p-6 sm:p-10">
        <h1 className="font-expanded text-ink text-4xl leading-none font-extrabold break-words">
          {org.name}
        </h1>
        <p className="text-ink-soft">
          Workplace · {org._count.memberships} {org._count.memberships === 1 ? "colleague" : "colleagues"}
        </p>
        <p className="text-lg leading-relaxed">
          Your workplace is doing Christmas presents differently this year. Share
          your Amazon wishlist, pick up a colleague&apos;s whenever you&apos;re
          ready, and send them something anonymously. Nobody ever sees an address.
        </p>
        {org.status === "PENDING" && !alreadyIn && (
          <p role="status" className="bg-gold-soft/40 border-gold rounded-label border px-3 py-2 text-sm">
            {org.name} is new and waiting for our approval. You can join now;
            gifting opens once it&apos;s approved.
          </p>
        )}
        <InviteFlow
          kind="workplace"
          group={{ id: org.id, name: org.name, status: org.status, members: org._count.memberships }}
          domain={org.domain}
          codeRequired={!!org.joinCode}
          code={code}
          signedIn={!!session?.user}
          sessionEmail={session?.user?.email ?? null}
          alreadyIn={alreadyIn}
        />
      </div>
    </article>
  );
}

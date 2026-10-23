import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { PrintButton } from "~/app/_components/groups/print-button";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const metadata: Metadata = {
  title: "Poster · Random Acts of Santa",
  robots: { index: false },
};

const formatCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

/**
 * Day 16, "Bring your team": a printable A4 poster with a QR code to join.
 * Organisers of the group (or site admins) only.
 */
export default async function PosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();
  const { id } = await params;
  const [group, membership, me] = await Promise.all([
    db.group.findUnique({ where: { id } }),
    db.membership.findUnique({
      where: { groupId_userId: { groupId: id, userId: session.user.id } },
      select: { role: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { adminLevel: true },
    }),
  ]);
  if (!group || group.kind === "TEAM") notFound();
  if (membership?.role !== "ADMIN" && me?.adminLevel !== "SITE") notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "raosanta.uk";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const isOrg = group.kind === "ORG";
  const url = isOrg
    ? `${proto}://${host}/${group.emailDomain ?? ""}`
    : `${proto}://${host}/join/${group.joinCode ?? ""}`;
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#18223a", light: "#fffdf8" },
  });

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .poster, .poster * { visibility: visible; }
          .poster { position: fixed; inset: 0; margin: 0; box-shadow: none; border-radius: 0; }
        }
      `}</style>
      <PrintButton />
      <article className="poster bg-paper text-ink rounded-label shadow-lift flex aspect-[210/297] w-full max-w-[640px] flex-col items-center justify-between overflow-hidden text-center">
        <div className="airmail h-4 w-full" aria-hidden />
        <div className="flex flex-col items-center gap-4 px-10">
          <p className="label-caps text-ink-soft tracking-[0.2em]">
            Random Acts of Santa
          </p>
          <h1 className="font-expanded text-4xl leading-none font-extrabold sm:text-5xl">
            Christmas, without the draw
          </h1>
          <p className="text-lg">
            Share your Amazon wishlist, pick up someone else&apos;s whenever
            you&apos;re ready, and gift what you like. Nobody sees an address.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div
            className="size-56 sm:size-64"
            role="img"
            aria-label={`QR code for ${url}`}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="font-expanded text-2xl font-extrabold">
            Join {isOrg ? `us at ${group.name}` : group.name}
          </p>
          <p className="text-ink-soft break-all">
            {url.replace(/^https?:\/\//, "")}
          </p>
          {isOrg ? (
            <p>
              Choose &ldquo;Join your workplace&rdquo; with your @
              {group.emailDomain} email
              {group.joinCode ? ` and code ${formatCode(group.joinCode)}` : ""}.
            </p>
          ) : (
            group.joinCode && (
              <p className="font-expanded text-post text-3xl font-extrabold tracking-[0.2em]">
                {formatCode(group.joinCode)}
              </p>
            )
          )}
        </div>
        <div className="airmail h-4 w-full" aria-hidden />
      </article>
    </div>
  );
}

import { env } from "~/env";
import { auth } from "~/server/auth";
import { renderBanner } from "~/server/banner-image";
import { db } from "~/server/db";
import { bannerData, isBannerSize } from "~/server/group-banners";

export const runtime = "nodejs";

/**
 * A group's promotional banner as a PNG (owner, 17 Nov). Organisers of the
 * group and site admins only, like the poster: it carries the join link.
 * ?download=1 saves it as a file.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; size: string }> },
) {
  const notFound = () => new Response("Not found", { status: 404 });
  const session = await auth();
  if (!session?.user?.id) return notFound();
  const { id, size: raw } = await params;
  const size = raw.replace(/\.png$/, "");
  if (!isBannerSize(size)) return notFound();

  const [group, membership, me] = await Promise.all([
    db.group.findUnique({ where: { id } }),
    db.membership.findUnique({
      where: { groupId_userId: { groupId: id, userId: session.user.id } },
      select: { role: true },
    }),
    db.user.findUnique({ where: { id: session.user.id }, select: { adminLevel: true } }),
  ]);
  if (!group || group.kind === "TEAM") return notFound();
  if (membership?.role !== "ADMIN" && me?.adminLevel !== "SITE") return notFound();

  const origin = env.AUTH_URL ? new URL(env.AUTH_URL).origin : new URL(req.url).origin;
  const image = await renderBanner(size, await bannerData(db, group, origin));
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "private, no-store");
  if (new URL(req.url).searchParams.get("download")) {
    const slug = (group.emailDomain ?? group.name).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
    headers.set("Content-Disposition", `attachment; filename="raosanta-${slug}-${size}.png"`);
  }
  return new Response(image.body, { status: 200, headers });
}

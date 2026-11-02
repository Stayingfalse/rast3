import { db } from "~/server/db";
import { renderWallImage } from "~/server/share-card-image";
import { getPublicWall } from "~/server/wall";

export const runtime = "nodejs";

/** The Wall of Kindness as a 1200×630 PNG: link previews and the download. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const wall = await getPublicWall(db, code);
  if (!wall) return new Response("Not found", { status: 404 });
  return renderWallImage(wall);
}

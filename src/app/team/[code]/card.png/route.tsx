import { renderShareCardImage } from "~/server/share-card-image";
import { getPublicShareCard } from "~/server/share-cards";

export const runtime = "nodejs";

/** The share card as a 1200×630 PNG: link previews and the download button. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const card = await getPublicShareCard(code, "team");
  if (!card) return new Response("Not found", { status: 404 });
  return renderShareCardImage(card);
}

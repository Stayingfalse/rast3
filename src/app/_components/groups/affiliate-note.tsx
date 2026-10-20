/**
 * Shown on a group's page when its wishlists open with Amazon affiliate
 * links (20 Oct), so members know why and that it costs them nothing.
 */
export function AffiliateNote({ tone = "night" }: { tone?: "night" | "label" }) {
  const text = tone === "night" ? "text-frost-soft" : "text-ink-soft";
  return (
    <p className={`${text} max-w-2xl text-sm`}>
      <span className={`label-caps mr-2 ${tone === "night" ? "text-frost" : "text-ink"}`}>
        Affiliate links
      </span>
      Wishlists in this group open from a gift page with an Amazon affiliate
      link. When you buy through it, Amazon pays Random Acts of Santa a small
      commission at no extra cost to you, which helps keep the site free. As
      an Amazon Associate, Random Acts of Santa earns from qualifying
      purchases.
    </p>
  );
}

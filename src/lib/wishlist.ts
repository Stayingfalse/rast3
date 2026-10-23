/**
 * Amazon's stores, by domain (owner, 22 Oct 2026: any store with wishlists,
 * not just the UK). Santas buy on the list's own store and Amazon ships to
 * its gift address; affiliate tags are only added on amazon.co.uk.
 */
export const AMAZON_STORES = [
  "amazon.co.uk",
  "amazon.com",
  "amazon.ca",
  "amazon.com.mx",
  "amazon.com.br",
  "amazon.ie",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.nl",
  "amazon.com.be",
  "amazon.se",
  "amazon.pl",
  "amazon.com.tr",
  "amazon.ae",
  "amazon.sa",
  "amazon.eg",
  "amazon.in",
  "amazon.co.jp",
  "amazon.sg",
  "amazon.com.au",
] as const;

const STORE = AMAZON_STORES.map((d) => d.replace(/\./g, "\\.")).join("|");

/** Amazon wishlist links from any store (shared by the profile, check-in and their forms). */
export const amazonWishlistRegex = new RegExp(
  `^https://(?:www\\.|smile\\.)?(?:${STORE})/(?:hz/|gp/)?(?:registry/)?wishlist/(?:ls/)?([A-Z0-9]{10,13})(?:/.*)?(?:[?#].*)?$`,
  "i",
);

export const WISHLIST_HINT =
  "That isn't an Amazon wishlist link. It should look like https://www.amazon.co.uk/hz/wishlist/ls/… (any Amazon store works).";

/**
 * The wishlist address without its query string or fragment, so nobody can
 * slip their own affiliate tag (?tag=…) or tracking into a list others open.
 */
export function cleanWishlistUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.trim();
  }
}

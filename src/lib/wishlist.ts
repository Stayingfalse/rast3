/** Amazon UK wishlist links (shared by the profile, check-in and their forms). */
export const amazonWishlistRegex =
  /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:\?.*)?$/i;

export const WISHLIST_HINT =
  "That isn't an Amazon UK wishlist link. It should look like https://www.amazon.co.uk/hz/wishlist/ls/…";

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

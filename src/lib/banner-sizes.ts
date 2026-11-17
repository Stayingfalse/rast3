/** The promotional banners' standard web sizes (owner, 17 Nov). */
export const BANNER_SIZES = {
  "1200x628": { width: 1200, height: 628, use: "Social posts, intranet pages and email headers" },
  "728x90": { width: 728, height: 90, use: "Website leaderboard" },
  "300x250": { width: 300, height: 250, use: "Sidebar or newsletter" },
  "320x100": { width: 320, height: 100, use: "Mobile" },
} as const;
export type BannerSize = keyof typeof BANNER_SIZES;
export const isBannerSize = (s: string): s is BannerSize => s in BANNER_SIZES;

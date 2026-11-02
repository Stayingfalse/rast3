/**
 * Festive names: how thank-you posters appear in public (the feed, share
 * cards, the Wall of Kindness). The same member always gets the same name,
 * worked out from their user id, so no real name ever needs to leave the
 * server. Shared by the client feed and server-rendered pages.
 */
export const CHRISTMAS_NAMES = [
  "Jingle Bell",
  "Holly Berry",
  "Candy Cane",
  "Snow Flake",
  "Winter Star",
  "Frost Bite",
  "Pine Needle",
  "Sugar Plum",
  "Ginger Bread",
  "Icicle Drop",
  "Mistletoe",
  "Nutcracker",
  "Tinsel Shine",
  "Cocoa Bean",
  "Peppermint",
  "Sleigh Bell",
  "Reindeer",
  "Snowball",
  "Eggnog",
  "Christmas Tree",
  "Angel Wing",
  "Star Light",
  "Gift Wrap",
  "Ribbon Bow",
  "Ornament",
  "Candy Mint",
  "Hot Cocoa",
  "Fire Place",
  "Wreath Maker",
  "Cookie Baker",
  "Snow Angel",
  "Ice Crystal",
  "Winter Moon",
  "Frost King",
  "Snow Queen",
  "Jingle Jangle",
  "Merry Maker",
  "Joy Bringer",
  "Hope Bearer",
  "Peace Keeper",
  "Love Giver",
  "Kind Heart",
  "Gentle Soul",
  "Warm Hug",
  "Sweet Smile",
  "Bright Light",
  "Happy Helper",
  "Cheerful Elf",
  "Magic Maker",
  "Wonder Worker",
] as const;

/** A member's festive name, the same every time for the same user id. */
export function getChristmasIdentity(userId: string): { name: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash; // 32-bit integer
  }
  return { name: CHRISTMAS_NAMES[Math.abs(hash) % CHRISTMAS_NAMES.length]! };
}

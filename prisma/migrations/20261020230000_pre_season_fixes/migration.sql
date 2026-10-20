-- Pre-season fixes (20 Oct 2026, two independent reviews):
-- 1. A wishlist can come round again in a later season, never twice in one:
--    WishlistAssignment gets its season (Aug-Jul year, from assignedAt) and
--    the "once ever" unique key becomes "once per season".
-- 2. Gift pages keep the wishlist they were made for (owner decision).
-- 3. "Open early" lasts one season (Group.openEarlySeason).
-- 4. Saved wishlist links lose any query string, so nobody's own ?tag=...
--    rides along on links others open.

-- 1. Season on pick-ups
ALTER TABLE `WishlistAssignment` ADD COLUMN `season` INTEGER NULL;
UPDATE `WishlistAssignment`
SET `season` = IF(MONTH(`assignedAt`) >= 8, YEAR(`assignedAt`), YEAR(`assignedAt`) - 1);
ALTER TABLE `WishlistAssignment` MODIFY `season` INTEGER NOT NULL;
-- the new key first (it also serves the assignedUserId foreign key), then the old one goes
CREATE UNIQUE INDEX `WishlistAssignment_assignedUserId_wishlistOwnerId_season_key` ON `WishlistAssignment`(`assignedUserId`, `wishlistOwnerId`, `season`);
DROP INDEX `WishlistAssignment_assignedUserId_wishlistOwnerId_key` ON `WishlistAssignment`;

-- 4. Clean saved wishlist links (before the gift pages copy them)
UPDATE `User`
SET `amazonWishlistUrl` = SUBSTRING_INDEX(SUBSTRING_INDEX(`amazonWishlistUrl`, '#', 1), '?', 1)
WHERE `amazonWishlistUrl` LIKE '%?%' OR `amazonWishlistUrl` LIKE '%#%';

-- 2. Gift pages keep their wishlist (existing pages: the owner's current one)
ALTER TABLE `GiftPage` ADD COLUMN `wishlistUrl` VARCHAR(191) NULL;
UPDATE `GiftPage` gp JOIN `User` u ON u.`id` = gp.`ownerId`
SET gp.`wishlistUrl` = u.`amazonWishlistUrl`
WHERE gp.`wishlistUrl` IS NULL;

-- 3. Open early for one season (groups opened early now: this season, 2026)
ALTER TABLE `Group` ADD COLUMN `openEarlySeason` INTEGER NULL;
UPDATE `Group` SET `openEarlySeason` = 2026 WHERE `openEarly` = true;
ALTER TABLE `Group` DROP COLUMN `openEarly`;

-- Amazon.com (US) Associates account (owner, 23 Oct 2026): a US default ID,
-- group IDs per store, and the owner's US tracking IDs in the pool.

-- AlterTable
ALTER TABLE `AffiliateSettings` ADD COLUMN `defaultTagUs` VARCHAR(191) NOT NULL DEFAULT 'raosanta-20';

-- AlterTable: every existing group ID is a UK one (they all end in -21)
ALTER TABLE `AffiliateTag` ADD COLUMN `store` ENUM('UK', 'US') NOT NULL DEFAULT 'UK';

-- One ID per group per store per season. The new index comes first, so the
-- groupId foreign key always has an index to use.
CREATE UNIQUE INDEX `AffiliateTag_groupId_season_store_key` ON `AffiliateTag`(`groupId`, `season`, `store`);
DROP INDEX `AffiliateTag_groupId_season_key` ON `AffiliateTag`;

-- The owner's US tracking IDs
INSERT IGNORE INTO `AffiliateTrackingId` (`tag`) VALUES
  ('raosanta-20'), ('raosanta01-20'), ('raosanta02-20'), ('raosanta03-20'),
  ('raosanta04-20'), ('raosanta05-20'), ('raosanta06-20'), ('raosanta07-20'),
  ('raosanta08-20'), ('raosanta09-20');

-- Pool of Amazon tracking IDs (created in Associates Central, 20 Oct 2026),
-- and one group per tracking ID per season.

-- CreateTable
CREATE TABLE `AffiliateTrackingId` (
    `tag` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`tag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The owner's tracking IDs
INSERT IGNORE INTO `AffiliateTrackingId` (`tag`) VALUES
  ('raosanta01-21'), ('raosanta02-21'), ('raosanta03-21'), ('raosanta04-21'),
  ('raosanta05-21'), ('raosanta06-21'), ('raosanta07-21'), ('raosanta08-21'),
  ('raosanta09-21'), ('raosanta10-21'), ('raosanta11-21'), ('raosanta12-21');

-- Any ID already given to a group joins the pool
INSERT IGNORE INTO `AffiliateTrackingId` (`tag`) SELECT DISTINCT `tag` FROM `AffiliateTag`;

-- An ID given to two groups in one season keeps its first group only
DELETE t1 FROM `AffiliateTag` t1
JOIN `AffiliateTag` t2 ON t1.`season` = t2.`season` AND t1.`tag` = t2.`tag` AND t1.`id` > t2.`id`;

-- CreateIndex
CREATE UNIQUE INDEX `AffiliateTag_season_tag_key` ON `AffiliateTag`(`season`, `tag`);

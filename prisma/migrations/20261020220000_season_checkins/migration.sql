-- Day 18 (20 Oct 2026): the Christmas season.
-- - SeasonCheckIn: members confirm their wishlist and groups once a season.
-- - Group.openEarly: site admins can open a group outside the season's dates.
-- - GiftPage.ownerId becomes optional (SET NULL), so a gift page never 404s
--   when its owner deletes their account; it says the list is gone instead.
-- - Pick-ups from earlier seasons (before 1 Aug 2026) are archived. Gift
--   pages are untouched.

-- DropForeignKey
ALTER TABLE `GiftPage` DROP FOREIGN KEY `GiftPage_ownerId_fkey`;

-- AlterTable
ALTER TABLE `GiftPage` MODIFY `ownerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Group` ADD COLUMN `openEarly` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `SeasonCheckIn` (
    `userId` VARCHAR(191) NOT NULL,
    `season` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `season`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SeasonCheckIn` ADD CONSTRAINT `SeasonCheckIn_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GiftPage` ADD CONSTRAINT `GiftPage_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Archive last season's pick-ups (the app keeps doing this as seasons roll over)
UPDATE `WishlistAssignment` SET `isActive` = false, `archived` = true
WHERE `assignedAt` < '2026-08-01 00:00:00.000' AND (`isActive` = true OR `archived` = false);

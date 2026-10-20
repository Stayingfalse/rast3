-- Amazon affiliate links (20 Oct 2026): site settings (master switch off by
-- default), a per-group mode, per-group tracking IDs per season, and gift pages.

-- AlterTable
ALTER TABLE `Group` ADD COLUMN `affiliate` ENUM('DEFAULT', 'ON', 'OFF') NOT NULL DEFAULT 'DEFAULT';
-- CreateTable
CREATE TABLE `AffiliateSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'site',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `defaultTag` VARCHAR(191) NOT NULL DEFAULT 'raosanta04-21',
    `orgDefault` BOOLEAN NOT NULL DEFAULT false,
    `communityDefault` BOOLEAN NOT NULL DEFAULT true,
    `friendsDefault` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `AffiliateTag` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `season` INTEGER NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    UNIQUE INDEX `AffiliateTag_groupId_season_key`(`groupId`, `season`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `GiftPage` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `season` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `GiftPage_groupId_idx`(`groupId`),
    UNIQUE INDEX `GiftPage_ownerId_groupId_season_key`(`ownerId`, `groupId`, `season`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- AddForeignKey
ALTER TABLE `AffiliateTag` ADD CONSTRAINT `AffiliateTag_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `GiftPage` ADD CONSTRAINT `GiftPage_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `GiftPage` ADD CONSTRAINT `GiftPage_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

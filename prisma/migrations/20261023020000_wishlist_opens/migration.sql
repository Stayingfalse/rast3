-- Wishlist opens (owner, 23 Oct): counted on our own server, no cookies
-- CreateTable
CREATE TABLE `WishlistOpen` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `season` INTEGER NOT NULL,
    `store` VARCHAR(32) NOT NULL,
    `affiliateOn` BOOLEAN NOT NULL,
    `tagged` BOOLEAN NOT NULL,
    `viaGiftPage` BOOLEAN NOT NULL,
    `assignmentId` VARCHAR(191) NULL,
    `giftPageId` VARCHAR(64) NULL,
    `groupId` VARCHAR(191) NULL,

    INDEX `WishlistOpen_season_store_idx`(`season`, `store`),
    INDEX `WishlistOpen_assignmentId_idx`(`assignmentId`),
    INDEX `WishlistOpen_giftPageId_idx`(`giftPageId`),
    INDEX `WishlistOpen_groupId_idx`(`groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WishlistOpen` ADD CONSTRAINT `WishlistOpen_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `WishlistAssignment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE `WishlistAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `assignedUserId` VARCHAR(191) NOT NULL,
    `wishlistOwnerId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `WishlistAssignment_assignedUserId_idx`(`assignedUserId`),
    INDEX `WishlistAssignment_wishlistOwnerId_idx`(`wishlistOwnerId`),
    INDEX `WishlistAssignment_isActive_idx`(`isActive`),
    UNIQUE INDEX `WishlistAssignment_assignedUserId_wishlistOwnerId_key`(`assignedUserId`, `wishlistOwnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `wishlistAssignmentId` VARCHAR(191) NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    INDEX `Purchase_userId_idx`(`userId`),
    INDEX `Purchase_wishlistAssignmentId_idx`(`wishlistAssignmentId`),
    UNIQUE INDEX `Purchase_wishlistAssignmentId_key`(`wishlistAssignmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WishlistReport` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `wishlistAssignmentId` VARCHAR(191) NOT NULL,
    `reportType` ENUM('NO_ITEMS', 'DOESNT_EXIST', 'NO_ADDRESS', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NULL,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,

    INDEX `WishlistReport_userId_idx`(`userId`),
    INDEX `WishlistReport_wishlistAssignmentId_idx`(`wishlistAssignmentId`),
    INDEX `WishlistReport_reportType_idx`(`reportType`),
    INDEX `WishlistReport_resolved_idx`(`resolved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WishlistAssignment` ADD CONSTRAINT `WishlistAssignment_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistAssignment` ADD CONSTRAINT `WishlistAssignment_wishlistOwnerId_fkey` FOREIGN KEY (`wishlistOwnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_wishlistAssignmentId_fkey` FOREIGN KEY (`wishlistAssignmentId`) REFERENCES `WishlistAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistReport` ADD CONSTRAINT `WishlistReport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistReport` ADD CONSTRAINT `WishlistReport_wishlistAssignmentId_fkey` FOREIGN KEY (`wishlistAssignmentId`) REFERENCES `WishlistAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

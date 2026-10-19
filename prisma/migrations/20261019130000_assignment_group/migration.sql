-- Day 14: wishlists picked up inside a friends or community group remember it
ALTER TABLE `WishlistAssignment` ADD COLUMN `groupId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `WishlistAssignment_groupId_idx` ON `WishlistAssignment`(`groupId`);

-- AddForeignKey
ALTER TABLE `WishlistAssignment` ADD CONSTRAINT `WishlistAssignment_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

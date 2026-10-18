-- CreateTable
CREATE TABLE `ShareCard` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('SENT', 'THANKS') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NULL,
    `kudosId` VARCHAR(191) NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ShareCard_purchaseId_key`(`purchaseId`),
    UNIQUE INDEX `ShareCard_kudosId_key`(`kudosId`),
    INDEX `ShareCard_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ShareCard` ADD CONSTRAINT `ShareCard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareCard` ADD CONSTRAINT `ShareCard_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareCard` ADD CONSTRAINT `ShareCard_kudosId_fkey` FOREIGN KEY (`kudosId`) REFERENCES `Kudos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminder emails (22 Oct): a per-person opt-out and a log that makes each reminder send once
-- AlterTable
ALTER TABLE `User` ADD COLUMN `emailReminders` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `EmailLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` ENUM('CHECK_IN_NUDGE', 'SEASON_OPEN', 'GIFT_RECEIVED') NOT NULL,
    `season` INTEGER NOT NULL,
    `ref` VARCHAR(64) NOT NULL DEFAULT '',
    `status` ENUM('SENT', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'SKIPPED',
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailLog_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `EmailLog_userId_kind_season_ref_key`(`userId`, `kind`, `season`, `ref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmailLog` ADD CONSTRAINT `EmailLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


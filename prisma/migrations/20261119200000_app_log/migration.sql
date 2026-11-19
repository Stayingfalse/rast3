-- 19 Nov: our own log for site admins (Admin › Logs), kept 30 days
CREATE TABLE `AppLog` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `level` ENUM('INFO', 'WARN', 'ERROR') NOT NULL,
    `area` VARCHAR(40) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `detail` JSON NULL,

    INDEX `AppLog_createdAt_idx`(`createdAt`),
    INDEX `AppLog_level_createdAt_idx`(`level`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `ShareCard` ADD COLUMN `groupKey` VARCHAR(191) NULL,
    ADD COLUMN `label` VARCHAR(191) NULL,
    MODIFY `kind` ENUM('SENT', 'THANKS', 'ORG', 'TEAM') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ShareCard_groupKey_key` ON `ShareCard`(`groupKey`);

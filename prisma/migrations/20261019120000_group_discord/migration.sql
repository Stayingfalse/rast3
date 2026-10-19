-- Day 13: community groups can be joined through their Discord server
ALTER TABLE `Group` ADD COLUMN `discordGuildId` VARCHAR(191) NULL,
    ADD COLUMN `discordRoleId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Group_discordGuildId_key` ON `Group`(`discordGuildId`);

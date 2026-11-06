-- 6 Nov: more about a community's linked Discord server for site admins:
-- its icon, online count, notable features, the organiser's role there, and
-- when these were last checked with Discord
ALTER TABLE `Group` ADD COLUMN `discordIcon` VARCHAR(64) NULL,
    ADD COLUMN `discordOnlineCount` INTEGER NULL,
    ADD COLUMN `discordFeatures` VARCHAR(255) NULL,
    ADD COLUMN `discordLinkedBy` VARCHAR(16) NULL,
    ADD COLUMN `discordCheckedAt` DATETIME(3) NULL;

-- 6 Nov: communities linked to a Discord server go live straight away; site
-- admins see the server's name and rough size
ALTER TABLE `Group` ADD COLUMN `discordGuildName` VARCHAR(100) NULL,
    ADD COLUMN `discordMemberCount` INTEGER NULL,
    ADD COLUMN `discordLinkedAt` DATETIME(3) NULL;

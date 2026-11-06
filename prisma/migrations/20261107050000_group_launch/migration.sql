-- 7 Nov: each group can have its own gifting launch date (default: the
-- season's). Groups a site admin had opened early keep picking up: their
-- launch becomes the start of that season's year (1 August).
ALTER TABLE `Group` ADD COLUMN `launchAt` DATETIME(3) NULL,
    ADD COLUMN `launchSeason` INTEGER NULL;

UPDATE `Group`
SET `launchSeason` = `openEarlySeason`,
    `launchAt` = STR_TO_DATE(CONCAT(`openEarlySeason`, '-08-01 00:00:00'), '%Y-%m-%d %H:%i:%s')
WHERE `openEarlySeason` IS NOT NULL;

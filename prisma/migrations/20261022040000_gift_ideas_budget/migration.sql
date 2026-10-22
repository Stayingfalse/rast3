-- Day 20: members' gift ideas and organisers' suggested budget bands
ALTER TABLE `User` ADD COLUMN `giftIdeas` TEXT NULL;

ALTER TABLE `Group` ADD COLUMN `budget` ENUM('UP_TO_10', 'UP_TO_20', 'UP_TO_30', 'UP_TO_50') NULL;

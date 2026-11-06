-- 6 Nov: the last-order countdown. A site admin sets Amazon UK's last day to
-- order for standard Christmas delivery each season (it changes every year),
-- so late Santas see how long they have. Null: no countdown.
ALTER TABLE `Season` ADD COLUMN `lastOrderAt` DATETIME(3) NULL;

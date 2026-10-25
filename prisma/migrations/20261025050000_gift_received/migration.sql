-- Day 26: the person a gift was for can say it arrived (one tap, from the
-- site or the gift check-in email), so their Santa knows it landed.
ALTER TABLE `Purchase` ADD COLUMN `receivedAt` DATETIME(3) NULL;

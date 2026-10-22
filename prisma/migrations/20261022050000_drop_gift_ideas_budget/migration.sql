-- DEV ONLY (22 Oct). Day 20 (gift ideas and budgets) reached the dev database
-- and was then dropped by the owner; main never had it. These two dev-only
-- migrations keep dev's history recognisable and remove what it added.
ALTER TABLE `User` DROP COLUMN `giftIdeas`;

ALTER TABLE `Group` DROP COLUMN `budget`;

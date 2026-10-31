-- Day 30: privacy commitments. When each member was last signed in (for the
-- 24-month inactive deletion) and when they confirmed they're 16 or over.
ALTER TABLE `User` ADD COLUMN `lastSeenAt` DATETIME(3) NULL,
    ADD COLUMN `ageConfirmedAt` DATETIME(3) NULL;

-- Existing members: last seen at their latest recorded activity (a session's
-- last refresh, a profile, a pick-up, a gift, a thank-you or a check-in),
-- and no earlier than 1 Nov 2025, the first season. Never later than now.
UPDATE `User` u SET u.`lastSeenAt` = LEAST(NOW(3), GREATEST(
    TIMESTAMP('2025-11-01 00:00:00'),
    COALESCE((SELECT MAX(s.`expires`) - INTERVAL 30 DAY FROM `Session` s WHERE s.`userId` = u.`id`), TIMESTAMP('2025-11-01 00:00:00')),
    COALESCE(u.`profileCompletedAt`, TIMESTAMP('2025-11-01 00:00:00')),
    COALESCE((SELECT MAX(a.`assignedAt`) FROM `WishlistAssignment` a WHERE a.`assignedUserId` = u.`id`), TIMESTAMP('2025-11-01 00:00:00')),
    COALESCE((SELECT MAX(p.`purchasedAt`) FROM `Purchase` p WHERE p.`userId` = u.`id`), TIMESTAMP('2025-11-01 00:00:00')),
    COALESCE((SELECT MAX(k.`createdAt`) FROM `Kudos` k WHERE k.`userId` = u.`id`), TIMESTAMP('2025-11-01 00:00:00')),
    COALESCE((SELECT MAX(c.`createdAt`) FROM `SeasonCheckIn` c WHERE c.`userId` = u.`id`), TIMESTAMP('2025-11-01 00:00:00'))
));

CREATE INDEX `User_lastSeenAt_idx` ON `User`(`lastSeenAt`);

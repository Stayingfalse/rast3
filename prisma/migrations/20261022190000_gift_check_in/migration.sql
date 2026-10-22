-- Owner, 22 Oct: no email on the day a gift is marked (it spoils the
-- surprise). GIFT_RECEIVED becomes GIFT_CHECK_IN, sent days later.
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE', 'SEASON_OPEN', 'GIFT_RECEIVED', 'GIFT_CHECK_IN') NOT NULL;

UPDATE `EmailLog` SET `kind` = 'GIFT_CHECK_IN' WHERE `kind` = 'GIFT_RECEIVED';

ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE', 'SEASON_OPEN', 'GIFT_CHECK_IN') NOT NULL;

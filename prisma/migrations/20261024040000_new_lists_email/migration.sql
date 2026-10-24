-- Day 24: a weekly "new wishlists to pick up" email for people who are gifting.
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE', 'SEASON_OPEN', 'GIFT_CHECK_IN', 'NEW_LISTS') NOT NULL;

-- 6 Nov: launch emails. A "we're live" email to organisers when gifting
-- opens, and site admins' morning status email in launch week. Only the
-- EmailLog kind enum gains two values; existing rows keep their kinds.
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE', 'SEASON_OPEN', 'GIFT_CHECK_IN', 'NEW_LISTS', 'ORGANISER_LIVE', 'ADMIN_STATUS') NOT NULL;

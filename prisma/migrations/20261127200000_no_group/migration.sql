-- 27 Nov: remind people with a wishlist but no group to join or start one
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE','SEASON_OPEN','GIFT_CHECK_IN','NEW_LISTS','ORGANISER_LIVE','ADMIN_STATUS','ORGANISER_DRIVE','WISHLIST_PROBLEM','NO_GROUP') NOT NULL;

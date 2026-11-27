-- 27 Nov: email a wishlist's owner when two Santas have reported a problem with it
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE','SEASON_OPEN','GIFT_CHECK_IN','NEW_LISTS','ORGANISER_LIVE','ADMIN_STATUS','ORGANISER_DRIVE','WISHLIST_PROBLEM') NOT NULL;

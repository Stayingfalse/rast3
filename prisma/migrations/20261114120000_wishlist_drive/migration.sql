-- 14 Nov: the wishlist drive email to organisers before their group opens
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE','SEASON_OPEN','GIFT_CHECK_IN','NEW_LISTS','ORGANISER_LIVE','ADMIN_STATUS','ORGANISER_DRIVE') NOT NULL;

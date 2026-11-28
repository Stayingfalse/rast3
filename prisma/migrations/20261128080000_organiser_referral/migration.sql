-- 28 Nov (owner approved the wording): ask organisers once a season whether they know another group
ALTER TABLE `EmailLog` MODIFY `kind` ENUM('CHECK_IN_NUDGE','SEASON_OPEN','GIFT_CHECK_IN','NEW_LISTS','ORGANISER_LIVE','ADMIN_STATUS','ORGANISER_DRIVE','WISHLIST_PROBLEM','NO_GROUP','ORGANISER_REFERRAL') NOT NULL;

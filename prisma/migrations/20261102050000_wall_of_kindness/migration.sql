-- Day 34: Wall of Kindness. A group's thank-yous on one public page and
-- image, under festive names. It reuses ShareCard (groupKey "wall:<groupId>",
-- one per group), so only the kind enum gains a value. Existing rows keep
-- their kinds.
ALTER TABLE `ShareCard` MODIFY `kind` ENUM('SENT', 'THANKS', 'ORG', 'TEAM', 'WALL') NOT NULL;

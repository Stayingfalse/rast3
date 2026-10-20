-- ---------------------------------------------------------------------------
-- Retire the legacy organisation model (20 Oct 2026, owner's request).
--
-- Workplaces and teams have been Group/Membership rows since Day 8, kept in
-- step with the legacy Domain/Department tables and User.domain,
-- departmentId, adminLevel (DOMAIN/DEPARTMENT) and adminScope. Nothing reads
-- the legacy data any more, so this migration:
--   1. archives it into _legacy_* tables (no foreign keys; nothing is lost),
--   2. re-runs the Day 8 backfill so every legacy fact has its group row,
--   3. moves group share cards onto group ids,
--   4. drops the legacy tables and columns.
-- Steps 1-3 are idempotent.
-- ---------------------------------------------------------------------------

-- 1. Archive
CREATE TABLE `_legacy_Domain` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_legacy_Department` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_legacy_UserOrg` (
    `userId` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `adminLevel` VARCHAR(191) NOT NULL,
    `adminScope` VARCHAR(191) NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `_legacy_Domain` (`id`, `name`, `enabled`, `description`, `createdById`, `createdAt`)
SELECT `id`, `name`, `enabled`, `description`, `createdById`, `createdAt` FROM `Domain`;

INSERT IGNORE INTO `_legacy_Department` (`id`, `name`, `domain`, `createdAt`)
SELECT `id`, `name`, `domain`, `createdAt` FROM `Department`;

INSERT IGNORE INTO `_legacy_UserOrg` (`userId`, `domain`, `departmentId`, `adminLevel`, `adminScope`)
SELECT `id`, `domain`, `departmentId`, `adminLevel`, `adminScope` FROM `User`
WHERE `domain` IS NOT NULL OR `departmentId` IS NOT NULL OR `adminLevel` IN ('DOMAIN', 'DEPARTMENT');

-- 2. Backfill check (same rules and ids as the Day 8 backfill). Normally a
-- no-op: the app kept memberships in step with the legacy fields.

-- Teams for departments whose organisation exists but has no team row yet
INSERT IGNORE INTO `Group` (`id`, `kind`, `name`, `slug`, `status`, `parentId`, `departmentId`, `createdAt`, `updatedAt`)
SELECT CONCAT('g_', dep.`id`), 'TEAM', dep.`name`, CONCAT(o.`slug`, '/', dep.`id`), 'ACTIVE', o.`id`, dep.`id`, dep.`createdAt`, NOW(3)
FROM `Department` dep
JOIN `Group` o ON o.`kind` = 'ORG' AND o.`emailDomain` = LOWER(TRIM(dep.`domain`));

-- Organisation memberships (an organiser keeps or gains ADMIN)
INSERT INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`,
       IF(u.`adminLevel` = 'DOMAIN' AND LOWER(TRIM(u.`adminScope`)) = g.`emailDomain`, 'ADMIN', 'MEMBER'),
       COALESCE(u.`profileCompletedAt`, NOW(3))
FROM `User` u
JOIN `Group` g ON g.`kind` = 'ORG' AND g.`emailDomain` = LOWER(TRIM(u.`domain`))
ON DUPLICATE KEY UPDATE `role` = IF(VALUES(`role`) = 'ADMIN', 'ADMIN', `role`);

INSERT INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`, 'ADMIN', NOW(3)
FROM `User` u
JOIN `Group` g ON g.`kind` = 'ORG' AND g.`emailDomain` = LOWER(TRIM(u.`adminScope`))
WHERE u.`adminLevel` = 'DOMAIN'
ON DUPLICATE KEY UPDATE `role` = 'ADMIN';

-- Team memberships
INSERT INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`,
       IF(u.`adminLevel` = 'DEPARTMENT' AND u.`adminScope` = u.`departmentId`, 'ADMIN', 'MEMBER'),
       COALESCE(u.`profileCompletedAt`, NOW(3))
FROM `User` u
JOIN `Group` g ON g.`kind` = 'TEAM' AND g.`departmentId` = u.`departmentId`
ON DUPLICATE KEY UPDATE `role` = IF(VALUES(`role`) = 'ADMIN', 'ADMIN', `role`);

INSERT INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`, 'ADMIN', NOW(3)
FROM `User` u
JOIN `Group` g ON g.`kind` = 'TEAM' AND g.`departmentId` = u.`adminScope`
WHERE u.`adminLevel` = 'DEPARTMENT'
ON DUPLICATE KEY UPDATE `role` = 'ADMIN';

-- 3. Group share cards: "org:<domain>" / "team:<departmentId>" become group ids
UPDATE `ShareCard` s
JOIN `Group` g ON g.`kind` = 'ORG' AND g.`emailDomain` = LOWER(TRIM(SUBSTRING(s.`groupKey`, 5)))
SET s.`groupKey` = CONCAT('org:', g.`id`)
WHERE s.`groupKey` LIKE 'org:%';

UPDATE `ShareCard` s
JOIN `Group` g ON g.`kind` = 'TEAM' AND g.`departmentId` = SUBSTRING(s.`groupKey`, 6)
SET s.`groupKey` = CONCAT('team:', g.`id`)
WHERE s.`groupKey` LIKE 'team:%';

-- 4. Organisers are ADMIN memberships now; only site admins keep a level
UPDATE `User` SET `adminLevel` = 'USER', `adminScope` = NULL
WHERE `adminLevel` IN ('DOMAIN', 'DEPARTMENT');

-- DropForeignKey
ALTER TABLE `Domain` DROP FOREIGN KEY `Domain_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_departmentId_fkey`;

-- DropIndex
DROP INDEX `Group_departmentId_key` ON `Group`;

-- DropIndex
DROP INDEX `User_departmentId_fkey` ON `User`;

-- AlterTable
ALTER TABLE `Group` DROP COLUMN `departmentId`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `adminScope`,
    DROP COLUMN `departmentId`,
    DROP COLUMN `domain`,
    MODIFY `adminLevel` ENUM('SITE', 'USER') NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE `Department`;

-- DropTable
DROP TABLE `Domain`;

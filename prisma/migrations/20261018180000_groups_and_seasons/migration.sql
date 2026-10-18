-- CreateTable
CREATE TABLE `Season` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `opensAt` DATETIME(3) NOT NULL,
    `closesAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Season_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Group` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('ORG', 'TEAM', 'COMMUNITY', 'FRIENDS') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `description` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `emailDomain` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `joinCode` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Group_slug_key`(`slug`),
    UNIQUE INDEX `Group_emailDomain_key`(`emailDomain`),
    UNIQUE INDEX `Group_departmentId_key`(`departmentId`),
    UNIQUE INDEX `Group_joinCode_key`(`joinCode`),
    INDEX `Group_parentId_idx`(`parentId`),
    INDEX `Group_kind_status_idx`(`kind`, `status`),
    INDEX `Group_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Membership` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('MEMBER', 'ADMIN') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Membership_userId_idx`(`userId`),
    UNIQUE INDEX `Membership_groupId_userId_key`(`groupId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Group` ADD CONSTRAINT `Group_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Group` ADD CONSTRAINT `Group_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Backfill (Day 8). Additive only: Domain, Department and the User columns are
-- untouched and stay the source of truth until Day 9 moves queries over.
-- Every statement is idempotent and tolerant of messy legacy data.
-- ---------------------------------------------------------------------------

-- Christmas seasons: 2025 (back-filled stamps) and 2026
INSERT IGNORE INTO `Season` (`id`, `year`, `opensAt`, `closesAt`) VALUES
  ('season_2025', 2025, '2025-11-15 00:00:00.000', '2026-01-06 23:59:59.000'),
  ('season_2026', 2026, '2026-11-15 00:00:00.000', '2027-01-06 23:59:59.000');

-- ORG groups from Domain rows (enabled => ACTIVE, otherwise DISABLED)
INSERT IGNORE INTO `Group` (`id`, `kind`, `name`, `slug`, `status`, `description`, `emailDomain`, `createdById`, `createdAt`, `updatedAt`)
SELECT CONCAT('g_', MD5(LOWER(TRIM(d.`name`)))), 'ORG', LOWER(TRIM(d.`name`)), LOWER(TRIM(d.`name`)),
       IF(d.`enabled`, 'ACTIVE', 'DISABLED'), d.`description`, LOWER(TRIM(d.`name`)), d.`createdById`, d.`createdAt`, NOW(3)
FROM `Domain` d
WHERE TRIM(d.`name`) <> '';

-- ORG groups for domains used by departments or users but with no Domain row:
-- PENDING, i.e. waiting for a site admin (owner, 18 Oct)
INSERT IGNORE INTO `Group` (`id`, `kind`, `name`, `slug`, `status`, `emailDomain`, `createdAt`, `updatedAt`)
SELECT CONCAT('g_', MD5(x.dom)), 'ORG', x.dom, x.dom, 'PENDING', x.dom, NOW(3), NOW(3)
FROM (
  SELECT LOWER(TRIM(`domain`)) AS dom FROM `Department` WHERE TRIM(`domain`) <> ''
  UNION
  SELECT LOWER(TRIM(`domain`)) FROM `User` WHERE `domain` IS NOT NULL AND TRIM(`domain`) <> ''
) x
WHERE NOT EXISTS (SELECT 1 FROM `Group` g WHERE g.`emailDomain` = x.dom);

-- TEAM groups from departments, under their organisation
INSERT IGNORE INTO `Group` (`id`, `kind`, `name`, `slug`, `status`, `parentId`, `departmentId`, `createdAt`, `updatedAt`)
SELECT CONCAT('g_', dep.`id`), 'TEAM', dep.`name`, CONCAT(o.`slug`, '/', dep.`id`), 'ACTIVE', o.`id`, dep.`id`, dep.`createdAt`, NOW(3)
FROM `Department` dep
JOIN `Group` o ON o.`kind` = 'ORG' AND o.`emailDomain` = LOWER(TRIM(dep.`domain`));

-- Organisation memberships (domain admins of their own organisation => ADMIN)
INSERT IGNORE INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`,
       IF(u.`adminLevel` = 'DOMAIN' AND LOWER(TRIM(u.`adminScope`)) = g.`emailDomain`, 'ADMIN', 'MEMBER'),
       COALESCE(u.`profileCompletedAt`, NOW(3))
FROM `User` u
JOIN `Group` g ON g.`kind` = 'ORG' AND g.`emailDomain` = LOWER(TRIM(u.`domain`));

-- Domain admins of an organisation they aren't a member of
INSERT IGNORE INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`, 'ADMIN', NOW(3)
FROM `User` u
JOIN `Group` g ON g.`kind` = 'ORG' AND g.`emailDomain` = LOWER(TRIM(u.`adminScope`))
WHERE u.`adminLevel` = 'DOMAIN';

-- Team memberships (department admins of their own department => ADMIN)
INSERT IGNORE INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`,
       IF(u.`adminLevel` = 'DEPARTMENT' AND u.`adminScope` = u.`departmentId`, 'ADMIN', 'MEMBER'),
       COALESCE(u.`profileCompletedAt`, NOW(3))
FROM `User` u
JOIN `Group` g ON g.`kind` = 'TEAM' AND g.`departmentId` = u.`departmentId`;

-- Department admins of a department they aren't in
INSERT IGNORE INTO `Membership` (`id`, `groupId`, `userId`, `role`, `joinedAt`)
SELECT CONCAT('m_', MD5(CONCAT(g.`id`, u.`id`))), g.`id`, u.`id`, 'ADMIN', NOW(3)
FROM `User` u
JOIN `Group` g ON g.`kind` = 'TEAM' AND g.`departmentId` = u.`adminScope`
WHERE u.`adminLevel` = 'DEPARTMENT';

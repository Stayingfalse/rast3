-- Site-admin impersonation was removed (see dev commit f0d7687 and #23).
-- The table only ever existed on databases created from the 0_init baseline
-- (dev, fresh installs); prod never had it, hence IF EXISTS.
DROP TABLE IF EXISTS `ImpersonationAudit`;

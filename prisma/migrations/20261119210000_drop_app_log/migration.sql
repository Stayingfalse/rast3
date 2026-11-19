-- DEV ONLY (19 Nov). The in-app log table reached the dev database and was
-- then dropped on the owner's question (logs go to the log service); main
-- never had it. These two dev-only migrations keep dev's history
-- recognisable and remove what it added.
DROP TABLE `AppLog`;

-- runAfter delays a pending task until the given time (used for scheduled
-- retries of failed fetches); retryCount tracks how many retries have been used.
ALTER TABLE Tasks
  ADD COLUMN runAfter timestamp NULL DEFAULT NULL AFTER taskSchedule,
  ADD COLUMN retryCount tinyint unsigned NOT NULL DEFAULT 0 AFTER runAfter;

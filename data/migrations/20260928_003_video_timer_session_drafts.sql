ALTER TABLE `VideoTimerSessions`
  ADD COLUMN IF NOT EXISTS `status` enum('draft','completed') NOT NULL DEFAULT 'completed' AFTER `startOffsetMs`,
  ADD COLUMN IF NOT EXISTS `draftData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`draftData`)) AFTER `status`;

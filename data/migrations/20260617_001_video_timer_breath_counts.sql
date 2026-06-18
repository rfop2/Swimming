CREATE TABLE IF NOT EXISTS `VideoTimerSessionBreathCounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `lengthIndex` smallint unsigned NOT NULL,
  `fromM` decimal(6,2) NOT NULL,
  `toM` decimal(6,2) NOT NULL,
  `count` smallint unsigned DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_length` (`sessionId`,`lengthIndex`),
  KEY `idx_session_from_to` (`sessionId`,`fromM`,`toM`),
  CONSTRAINT `fk_VideoTimerSessionBreathCounts_Session`
    FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

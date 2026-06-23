CREATE TABLE IF NOT EXISTS `VideoTimerSessionBreathMarkers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `seq` int unsigned NOT NULL,
  `lengthIndex` smallint unsigned NOT NULL,
  `fromM` decimal(6,2) NOT NULL,
  `toM` decimal(6,2) NOT NULL,
  `tMs` int unsigned NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_seq` (`sessionId`,`seq`),
  KEY `idx_session_time` (`sessionId`,`tMs`),
  KEY `idx_session_length` (`sessionId`,`lengthIndex`),
  CONSTRAINT `fk_VideoTimerSessionBreathMarkers_Session`
    FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

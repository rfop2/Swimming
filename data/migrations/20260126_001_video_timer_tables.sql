CREATE TABLE IF NOT EXISTS `VideoTimerVideos` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(16) NOT NULL,
  `playbackUrl` varchar(255) NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `mimeType` varchar(64) NOT NULL,
  `size` bigint unsigned NOT NULL,
  `durationMs` int unsigned DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  CONSTRAINT `fk_VideoTimerVideos_User`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `VideoTimerSessions` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(16) NOT NULL,
  `swimmerId` varchar(8) DEFAULT NULL,
  `videoId` varchar(36) NOT NULL,
  `meetId` varchar(8) DEFAULT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `startOffsetMs` int unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),

  `resultSwimmer` varchar(8) DEFAULT NULL,
  `resultCourse` varchar(8) DEFAULT NULL,
  `resultStroke` varchar(32) DEFAULT NULL,
  `resultDistance` varchar(8) DEFAULT NULL,
  `resultSeq` int(11) DEFAULT NULL,

  PRIMARY KEY (`id`),

  KEY `idx_userId` (`userId`),
  KEY `idx_swimmerId` (`swimmerId`),
  KEY `idx_videoId` (`videoId`),
  KEY `idx_meetId` (`meetId`),

  KEY `idx_result` (`resultSwimmer`,`resultCourse`,`resultStroke`,`resultDistance`,`resultSeq`),

  UNIQUE KEY `ux_vts_user_result` (
    `userId`,
    `resultSwimmer`,`resultCourse`,`resultStroke`,`resultDistance`,`resultSeq`
  ),

  CONSTRAINT `fk_VideoTimerSessions_User`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_VideoTimerSessions_Swimmers`
    FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_VideoTimerSessions_Video`
    FOREIGN KEY (`videoId`) REFERENCES `VideoTimerVideos` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_VideoTimerSessions_Meets`
    FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_VideoTimerSessions_Result`
    FOREIGN KEY (`resultSwimmer`,`resultCourse`,`resultStroke`,`resultDistance`,`resultSeq`)
    REFERENCES `Results` (`swimmer`,`course`,`stroke`,`distance`,`seq`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;



CREATE TABLE IF NOT EXISTS `VideoTimerMarkers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `seq` int unsigned NOT NULL,
  `type` enum('surfacing','split') NOT NULL,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `tMs` int unsigned NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_seq` (`sessionId`,`seq`),
  KEY `idx_session_time` (`sessionId`,`tMs`),
  KEY `idx_session_type` (`sessionId`,`type`),
  KEY `idx_session_code` (`sessionId`,`code`),
  CONSTRAINT `fk_VideoTimerMarkers_Session`
    FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


CREATE TABLE IF NOT EXISTS `VideoTimerSessionAnalysis` (
  `sessionId` varchar(36) NOT NULL,
  `count10to50` smallint unsigned DEFAULT NULL,
  `count60to100` smallint unsigned DEFAULT NULL,
  `reactionMs` int unsigned DEFAULT NULL,
  `breakoutStartM` decimal(5,2) DEFAULT NULL,
  `turnRotationMs` int unsigned DEFAULT NULL,
  `breakoutTurnM` decimal(5,2) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`sessionId`),
  CONSTRAINT `fk_VideoTimerSessionAnalysis_Session`
    FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
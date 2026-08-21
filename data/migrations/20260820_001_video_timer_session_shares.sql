CREATE TABLE IF NOT EXISTS `VideoTimerSessionShares` (
  `id` varchar(36) NOT NULL,
  `sessionId` varchar(36) NOT NULL,
  `ownerId` varchar(16) NOT NULL,
  `sharedWithUserId` varchar(16) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_vtss_session_user` (`sessionId`,`sharedWithUserId`),
  KEY `idx_vtss_sharedWithUserId` (`sharedWithUserId`),
  KEY `idx_vtss_ownerId` (`ownerId`),
  CONSTRAINT `fk_VideoTimerSessionShares_Session`
    FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_VideoTimerSessionShares_Owner`
    FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_VideoTimerSessionShares_SharedWith`
    FOREIGN KEY (`sharedWithUserId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

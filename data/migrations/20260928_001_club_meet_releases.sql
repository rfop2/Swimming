-- Meets a club admin has released from their club, so the CLI club matcher
-- doesn't automatically link them to that club again.
CREATE TABLE IF NOT EXISTS `ClubMeetReleases` (
  `clubId` varchar(8) NOT NULL,
  `meetId` varchar(8) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`clubId`,`meetId`),
  KEY `meetId` (`meetId`),
  CONSTRAINT `ClubMeetReleases_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClubMeetReleases_ibfk_2` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

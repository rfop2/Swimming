CREATE TABLE IF NOT EXISTS `QualifyingPeriodsStaging` (
  `source` varchar(32) NOT NULL COMMENT 'swimming-times | swimturn',
  `year` int(11) NOT NULL COMMENT 'requested season year (--year)',
  `scope` enum('regional','county') NOT NULL,
  `area` varchar(32) NOT NULL,
  `type` enum('general','summer','winter') NOT NULL DEFAULT 'general',
  `qualifyingStart` date DEFAULT NULL,
  `qualifyingEnd` date DEFAULT NULL,
  `lastRaceDate` date DEFAULT NULL COMMENT 'Last date a race can be held to count for eligibility — only set when the source explicitly lists championship dates',
  `notes` varchar(255) DEFAULT NULL,
  `sourceUrl` varchar(512) DEFAULT NULL,
  `fetchedAt` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'explicitly set every run, not ON UPDATE, so unchanged rows still record last checked time',
  PRIMARY KEY (`source`,`year`,`scope`,`area`,`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

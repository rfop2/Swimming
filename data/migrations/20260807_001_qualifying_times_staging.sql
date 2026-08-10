CREATE TABLE IF NOT EXISTS `QualifyingTimesStaging` (
  `source` varchar(32) NOT NULL COMMENT 'swimming-times | swimturn',
  `year` int(11) NOT NULL COMMENT 'requested season year (--year)',
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(16) NOT NULL,
  `type` enum('general','summer','winter') NOT NULL DEFAULT 'general',
  `gender` varchar(16) NOT NULL,
  `age` varchar(8) NOT NULL,
  `timeString` varchar(16) NOT NULL,
  `time` decimal(8,2) NOT NULL DEFAULT 0.00,
  `sourceYear` int(11) DEFAULT NULL COMMENT 'season year actually found on the source (e.g. swimturn version prefix), when it differs from `year`',
  `sourceUrl` varchar(512) DEFAULT NULL,
  `fetchedAt` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'explicitly set every run, not ON UPDATE, so unchanged rows still record last checked time',
  PRIMARY KEY (`source`,`year`,`course`,`stroke`,`distance`,`scope`,`area`,`type`,`gender`,`age`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

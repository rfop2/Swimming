CREATE TABLE IF NOT EXISTS `SwimmingPools` (
  `id` int(10) unsigned NOT NULL COMMENT 'swimming.org poolfinder ID',
  `name` varchar(128) NOT NULL,
  `street` varchar(128) DEFAULT NULL,
  `town` varchar(64) DEFAULT NULL,
  `country` varchar(32) DEFAULT NULL,
  `postcode` varchar(10) DEFAULT NULL,
  `lat` decimal(9,6) DEFAULT NULL,
  `lon` decimal(9,6) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

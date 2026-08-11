CREATE TABLE IF NOT EXISTS `QualifyingReports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` int(11) NOT NULL,
  `sources` varchar(64) NOT NULL COMMENT 'comma-separated list of sources included, e.g. swimming-times,swimturn',
  `html` longtext NOT NULL,
  `generatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_generatedAt` (`generatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `ShareLinks` (
  `token` varchar(64) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `createdBy` varchar(16) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiresAt` datetime NOT NULL,
  `revokedAt` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`token`),
  KEY `idx_ShareLinks_swimmerId` (`swimmerId`),
  KEY `idx_ShareLinks_createdBy` (`createdBy`),
  CONSTRAINT `fk_ShareLinks_Swimmers`
    FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ShareLinks_User`
    FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

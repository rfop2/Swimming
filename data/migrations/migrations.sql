CREATE TABLE IF NOT EXISTS `SchemaMigrations` (
  `name` varchar(255) NOT NULL,
  `runAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
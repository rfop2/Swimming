-- Add role column combining type and admin into a single field
ALTER TABLE User
  ADD COLUMN role ENUM('system', 'admin', 'user') NOT NULL DEFAULT 'user' AFTER admin;

-- Migrate existing data
UPDATE User SET role = 'system' WHERE type = 'system';
UPDATE User SET role = 'admin' WHERE admin = 1 AND type != 'system';

-- Drop old columns and the UserTypes lookup table
ALTER TABLE User DROP FOREIGN KEY User_ibfk_1;
ALTER TABLE User DROP COLUMN type;
ALTER TABLE User DROP COLUMN admin;

DROP TABLE IF EXISTS UserTypes;

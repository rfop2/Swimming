-- Add role column combining type and admin into a single field
ALTER TABLE User
  ADD COLUMN role ENUM('system', 'admin', 'user') NOT NULL DEFAULT 'user' AFTER admin;

-- Migrate existing data
UPDATE User SET role = 'system' WHERE type = 'system';
UPDATE User SET role = 'admin' WHERE admin = 1 AND type != 'system';

-- Grant gratis 1-year subscriptions based on current user type, before type is dropped.
-- club -> club-large, trainer -> trainer, parent -> parent.
-- Only applies to regular users (not admin/system); does not downgrade existing paid subscriptions.
INSERT INTO UserSubscription (userId, tier, status, source, currentPeriodEnd)
SELECT
  id,
  CASE type
    WHEN 'parent'  THEN 'parent'
    WHEN 'trainer' THEN 'trainer'
    WHEN 'club'    THEN 'club-large'
  END,
  'active',
  'manual',
  DATE_ADD( NOW(), INTERVAL 1 YEAR )
FROM User
WHERE type IN ( 'parent', 'trainer', 'club' )
  AND role = 'user'
ON DUPLICATE KEY UPDATE
  tier             = VALUES( tier ),
  status           = 'active',
  source           = 'manual',
  currentPeriodEnd = DATE_ADD( GREATEST( IFNULL( currentPeriodEnd, NOW() ), NOW() ), INTERVAL 1 YEAR ),
  gcSubscriptionId = NULL,
  gcMandateId      = NULL,
  gcBillingRequestId = NULL;

-- Drop old columns and the UserTypes lookup table
ALTER TABLE User DROP FOREIGN KEY User_ibfk_1;
ALTER TABLE User DROP COLUMN type;
ALTER TABLE User DROP COLUMN admin;

DROP TABLE IF EXISTS UserTypes;

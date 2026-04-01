ALTER TABLE UserSubscription
  ADD COLUMN source ENUM('gocardless', 'manual') NOT NULL DEFAULT 'gocardless' AFTER currentPeriodEnd;

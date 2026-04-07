-- Subscription tier definitions
-- Stores commercial data (name, price, description) for each plan.
-- Feature access control remains in application code (useSubscription.ts).

CREATE TABLE IF NOT EXISTS SubscriptionTiers (
  id          VARCHAR(32)  PRIMARY KEY,
  name        VARCHAR(64)  NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount      INT          NOT NULL DEFAULT 0,   -- in pence (0 = free)
  currency    CHAR(3)      NOT NULL DEFAULT 'GBP',
  featured    TINYINT(1)   NOT NULL DEFAULT 0,   -- show "Most popular" badge
  sortOrder   INT          NOT NULL DEFAULT 0,
  active      TINYINT(1)   NOT NULL DEFAULT 1
);

INSERT INTO SubscriptionTiers (id, name, description, amount, currency, featured, sortOrder) VALUES
  ('free',       'Free',             'Get started tracking personal bests with no commitment.',               0,    'GBP', 0, 1),
  ('parent',     'Parent Tier',      'Everything you need to follow your swimmers through the season.',       600,  'GBP', 0, 2),
  ('trainer',    'Trainer Tier',     'Tools for coaches managing athletes across multiple events.',           1200, 'GBP', 1, 3),
  ('club-small', 'Club Tier (small)','Full club management for smaller swim clubs.',                         2500, 'GBP', 0, 4),
  ('club-large', 'Club Tier (large)','Unlimited scale for large clubs with big squads.',                     3500, 'GBP', 0, 5);

-- Change UserSubscription.tier from ENUM to VARCHAR with a FK to SubscriptionTiers
ALTER TABLE UserSubscription
  MODIFY COLUMN tier VARCHAR(32) NOT NULL DEFAULT 'free';

ALTER TABLE UserSubscription
  ADD CONSTRAINT fk_usersub_tier FOREIGN KEY (tier) REFERENCES SubscriptionTiers (id);

ALTER TABLE UserSubscription
  ADD COLUMN gcBillingRequestId VARCHAR(64) DEFAULT NULL AFTER gcCustomerId;

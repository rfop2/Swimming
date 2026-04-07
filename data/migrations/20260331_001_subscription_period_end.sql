ALTER TABLE UserSubscription
  ADD COLUMN currentPeriodEnd datetime NULL AFTER status;

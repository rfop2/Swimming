-- GoCardless subscription tracking
-- Run this migration to add payment/subscription support

CREATE TABLE IF NOT EXISTS UserSubscription (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  userId           VARCHAR(255)                                                    NOT NULL UNIQUE,
  gcCustomerId     VARCHAR(64)                                                     DEFAULT NULL,
  gcMandateId      VARCHAR(64)                                                     DEFAULT NULL,
  gcSubscriptionId VARCHAR(64)                                                     DEFAULT NULL,
  tier             ENUM('free', 'parent', 'trainer', 'club-small', 'club-large')  DEFAULT 'free',
  status           ENUM('pending', 'active', 'cancelled', 'failed')               DEFAULT 'pending',
  createdAt        TIMESTAMP                                                       DEFAULT NOW(),
  updatedAt        TIMESTAMP                                                       DEFAULT NOW() ON UPDATE NOW(),
  CONSTRAINT fk_usersub_user FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE
);

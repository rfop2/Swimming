-- Allow admin-created accounts to exist without a password until the user
-- completes setup via an emailed link (see PasswordResetTokens).
ALTER TABLE User
  MODIFY COLUMN password_hash text NULL;

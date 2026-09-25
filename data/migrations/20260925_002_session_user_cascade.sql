-- Session was the only table referencing User without ON DELETE CASCADE, which
-- made deleting any user with a session row fail. Orphaned sessions (for users
-- that no longer exist) must go first or the new constraint can't be created.
DELETE FROM Session WHERE user_id NOT IN ( SELECT id FROM User );

ALTER TABLE Session
  DROP FOREIGN KEY Session_ibfk_1,
  ADD CONSTRAINT fk_Session_user FOREIGN KEY (user_id) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE;

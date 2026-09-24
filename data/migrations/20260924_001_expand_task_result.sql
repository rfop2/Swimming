-- taskResult was varchar(240), too small to hold a full error message plus
-- stack trace; widen it so failure details aren't silently truncated.
ALTER TABLE Tasks
  MODIFY COLUMN taskResult text DEFAULT NULL;

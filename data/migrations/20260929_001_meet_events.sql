-- Course as set by the club admin, overriding Meets.course (which the CLI refreshes
-- from the meets listing), and the events taking place at the meet as a JSON array
-- of STROKE_DISTANCE keys (e.g. ["FREESTYLE__50M","BACKSTROKE__100M"]).
ALTER TABLE `MeetsMeta`
  ADD COLUMN `course` varchar(8) DEFAULT NULL AFTER `poolId`,
  ADD COLUMN `events` json DEFAULT NULL AFTER `course`;

ALTER TABLE `QualifyingPeriods`
  DROP COLUMN `eligibilityStart`,
  CHANGE COLUMN `eligibilityEnd` `lastRaceDate` date DEFAULT NULL COMMENT 'Last date a race can be held to count for eligibility';

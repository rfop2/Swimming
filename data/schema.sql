/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: swimming
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `swimming`
--

/*!40000 DROP DATABASE IF EXISTS `swimming`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `swimming` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;

USE `swimming`;

--
-- Table structure for table `ClubMeets`
--

DROP TABLE IF EXISTS `ClubMeets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClubMeets` (
  `clubId` varchar(16) NOT NULL,
  `meetId` varchar(8) NOT NULL,
  PRIMARY KEY (`clubId`,`meetId`) USING BTREE,
  KEY `idx_meetId` (`meetId`) USING BTREE,
  CONSTRAINT `ClubMeets_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClubMeets_ibfk_2` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ClubPools`
--

DROP TABLE IF EXISTS `ClubPools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClubPools` (
  `clubId` varchar(8) NOT NULL,
  `poolId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`clubId`,`poolId`),
  KEY `fk_ClubPools_Pools_2` (`poolId`),
  CONSTRAINT `fk_ClubPools_Clubs_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ClubPools_Pools_2` FOREIGN KEY (`poolId`) REFERENCES `Pools` (`poolId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ClubSwimmers`
--

DROP TABLE IF EXISTS `ClubSwimmers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClubSwimmers` (
  `clubId` varchar(8) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `squad` varchar(32) NOT NULL DEFAULT '',
  `rankedClub` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`clubId`,`swimmerId`) USING BTREE,
  KEY `swimmerId` (`swimmerId`),
  CONSTRAINT `ClubSwimmers_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClubSwimmers_ibfk_2` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Clubs`
--

DROP TABLE IF EXISTS `Clubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Clubs` (
  `clubId` varchar(8) NOT NULL,
  `clubName` varchar(128) NOT NULL,
  `clubAlias` varchar(32) DEFAULT NULL,
  `clubRegion` varchar(8) NOT NULL,
  `clubCounty` varchar(8) NOT NULL,
  `meetName` varchar(128) DEFAULT NULL,
  `lastMemberUpdate` timestamp NULL DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`clubId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Individual`
--

DROP TABLE IF EXISTS `Individual`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Individual` (
  `swimmer` varchar(8) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `time` decimal(8,2) NOT NULL,
  `converted_time` decimal(8,2) DEFAULT NULL,
  `wa_pts` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `meet` text DEFAULT NULL,
  `venue` text DEFAULT NULL,
  `licence` text DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`swimmer`,`course`,`stroke`,`distance`),
  KEY `swimmer` (`swimmer`),
  CONSTRAINT `Individual_ibfk_1` FOREIGN KEY (`swimmer`) REFERENCES `Swimmers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LocationAliases`
--

DROP TABLE IF EXISTS `LocationAliases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `LocationAliases` (
  `locationId` int(10) unsigned NOT NULL,
  `locationAlias` varchar(32) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`locationId`,`locationAlias`) USING BTREE,
  KEY `IDX_locationAlias` (`locationAlias`) USING BTREE,
  CONSTRAINT `LocationAliases_ibfk_1` FOREIGN KEY (`locationId`) REFERENCES `Locations` (`locationId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Locations`
--

DROP TABLE IF EXISTS `Locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Locations` (
  `locationId` int(10) unsigned NOT NULL,
  `locationName` varchar(32) NOT NULL,
  `locationDescription` varchar(255) NOT NULL,
  `locationType` varchar(32) NOT NULL,
  `latitude` varchar(16) NOT NULL,
  `longitude` varchar(16) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`locationId`),
  KEY `IDX_locationName` (`locationName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Logs`
--

DROP TABLE IF EXISTS `Logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Logs` (
  `logId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `logCategory` varchar(16) NOT NULL,
  `logType` varchar(16) NOT NULL,
  `logText` varchar(255) NOT NULL,
  `logTime` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`logId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Meets`
--

DROP TABLE IF EXISTS `Meets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Meets` (
  `id` varchar(8) NOT NULL,
  `code` varchar(16) NOT NULL,
  `date` date NOT NULL,
  `duration` int(11) NOT NULL,
  `name` text NOT NULL,
  `country` varchar(16) NOT NULL,
  `region` varchar(32) NOT NULL,
  `location` varchar(32) NOT NULL,
  `locationId` int(10) unsigned DEFAULT NULL,
  `course` varchar(8) NOT NULL,
  `level` int(11) NOT NULL,
  `type` varchar(16) NOT NULL,
  `contact` varchar(128) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MeetsMeta`
--

DROP TABLE IF EXISTS `MeetsMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `MeetsMeta` (
  `meetId` varchar(8) NOT NULL,
  `meetPack` varchar(255) DEFAULT NULL,
  `meetInfo` text DEFAULT NULL,
  `poolId` int(10) unsigned DEFAULT NULL,
  `clubId` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`meetId`),
  KEY `fk_MeetPools_Pools_2` (`poolId`),
  CONSTRAINT `fk_MeetPools_Meets_1` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MeetPools_Pools_2` FOREIGN KEY (`poolId`) REFERENCES `Pools` (`poolId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `MeetsView`
--

DROP TABLE IF EXISTS `MeetsView`;
/*!50001 DROP VIEW IF EXISTS `MeetsView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `MeetsView` AS SELECT
 1 AS `id`,
  1 AS `code`,
  1 AS `date`,
  1 AS `duration`,
  1 AS `name`,
  1 AS `country`,
  1 AS `region`,
  1 AS `location`,
  1 AS `latitude`,
  1 AS `longitude`,
  1 AS `course`,
  1 AS `level`,
  1 AS `type`,
  1 AS `contact`,
  1 AS `email` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `PasswordResetTokens`
--

DROP TABLE IF EXISTS `PasswordResetTokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `PasswordResetTokens` (
  `token` varchar(64) NOT NULL,
  `user_id` varchar(16) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`token`),
  KEY `idx_user_used` (`user_id`,`used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Performance`
--

DROP TABLE IF EXISTS `Performance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Performance` (
  `swimmer` varchar(8) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(16) NOT NULL,
  `rank` int(11) DEFAULT NULL,
  `best` decimal(8,2) DEFAULT NULL,
  `best_date` date DEFAULT NULL,
  `time` decimal(8,2) DEFAULT NULL,
  `time_date` date DEFAULT NULL,
  `difference` decimal(8,2) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`swimmer`,`course`,`stroke`,`distance`,`scope`,`area`),
  KEY `swimmer` (`swimmer`),
  CONSTRAINT `Performance_ibfk_1` FOREIGN KEY (`swimmer`) REFERENCES `Swimmers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Pools`
--

DROP TABLE IF EXISTS `Pools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Pools` (
  `poolId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `poolName` varchar(54) NOT NULL,
  `poolStreet1` varchar(54) DEFAULT NULL,
  `poolStreet2` varchar(54) DEFAULT NULL,
  `poolStreet3` varchar(54) DEFAULT NULL,
  `poolTown` varchar(54) DEFAULT NULL,
  `poolPostCode` varchar(54) DEFAULT NULL,
  `poolWhatThreeWords` varchar(54) DEFAULT NULL,
  PRIMARY KEY (`poolId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `QualifyingPeriods`
--

DROP TABLE IF EXISTS `QualifyingPeriods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingPeriods` (
  `year` int(11) NOT NULL,
  `scope` enum('regional','county') NOT NULL,
  `area` varchar(32) NOT NULL,
  `type` enum('general','summer','winter') NOT NULL DEFAULT 'general',
  `qualifyingStart` date DEFAULT NULL,
  `qualifyingEnd` date DEFAULT NULL,
  `eligibilityStart` date DEFAULT NULL,
  `eligibilityEnd` date DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`year`,`scope`,`area`,`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `QualifyingTimes`
--

DROP TABLE IF EXISTS `QualifyingTimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingTimes` (
  `year` int(11) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(16) NOT NULL,
  `type` enum('general','summer','winter') NOT NULL DEFAULT 'general',
  `gender` varchar(16) NOT NULL,
  `age` varchar(8) NOT NULL,
  `timeString` varchar(16) NOT NULL,
  `time` decimal(8,2) NOT NULL DEFAULT 0.00,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`year`,`course`,`stroke`,`distance`,`scope`,`area`,`type`,`gender`,`age`) USING BTREE,
  UNIQUE KEY `idx_qualifying` (`year`,`age`,`gender`,`course`,`stroke`,`distance`,`scope`,`area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Rankings`
--

DROP TABLE IF EXISTS `Rankings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Rankings` (
  `gender` varchar(16) NOT NULL,
  `age` varchar(8) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(16) NOT NULL,
  `position` int(11) NOT NULL,
  `rank` int(11) NOT NULL,
  `swimmer` varchar(8) NOT NULL,
  `name` text DEFAULT NULL,
  `ranked_club` text DEFAULT NULL,
  `yob` int(11) DEFAULT NULL,
  `meet_name` text DEFAULT NULL,
  `venue` text DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` decimal(8,2) DEFAULT NULL,
  `fina` int(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`gender`,`age`,`course`,`stroke`,`distance`,`scope`,`area`,`position`),
  KEY `idx_group` (`created`,`gender`,`age`,`course`,`stroke`,`distance`,`scope`,`area`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Results`
--

DROP TABLE IF EXISTS `Results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Results` (
  `swimmer` varchar(8) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `seq` int(11) NOT NULL,
  `time` decimal(8,2) DEFAULT NULL,
  `wa_pts` int(11) DEFAULT NULL,
  `round` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `meet` text NOT NULL,
  `venue` text DEFAULT NULL,
  `club_swam_under` text DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`swimmer`,`course`,`stroke`,`distance`,`seq`) USING BTREE,
  KEY `idx_results_swimmer` (`swimmer`),
  CONSTRAINT `Results_ibfk_1` FOREIGN KEY (`swimmer`) REFERENCES `Swimmers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Session`
--

DROP TABLE IF EXISTS `Session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Session` (
  `id` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `user_id` varchar(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `Session_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SessionTracking`
--

DROP TABLE IF EXISTS `SessionTracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SessionTracking` (
  `sessionId` varchar(64) NOT NULL,
  `sessionAction` enum('login','logout','expiry') NOT NULL,
  `userId` varchar(16) NOT NULL,
  `sessionIP` varchar(32) DEFAULT NULL,
  `actionTime` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`sessionId`,`sessionAction`),
  KEY `SessionTracking_ibfk_1` (`userId`),
  CONSTRAINT `SessionTracking_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-100m-female-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-100m-male-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-200m-female-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-200m-male-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-50m-female-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-50m-male-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-100m-female-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-100m-male-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-200m-female-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-200m-male-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-50m-female-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-50m-male-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-100m-female-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-100m-male-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-200m-female-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-200m-male-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-50m-female-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-50m-male-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-100m-female-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-100m-male-lc` (
  `100m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-60m` double DEFAULT NULL,
  `0-65m` double DEFAULT NULL,
  `0-70m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-80m` double DEFAULT NULL,
  `0-85m` double DEFAULT NULL,
  `0-90m` double DEFAULT NULL,
  `0-95m` double DEFAULT NULL,
  `95-100m finish` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-200m-female-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-200m-male-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-50m-female-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-50m-male-lc` (
  `50m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m Finish` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-individual_medley-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-individual_medley-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-individual_medley-200m-female-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-individual_medley-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-individual_medley-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-individual_medley-200m-male-lc` (
  `200m Time/Sec` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-50m` double DEFAULT NULL,
  `0-75m` double DEFAULT NULL,
  `0-100m` double DEFAULT NULL,
  `0-125m` double DEFAULT NULL,
  `0-150m` double DEFAULT NULL,
  `0-175m` double DEFAULT NULL,
  `175-200m` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `3rd 50m` double DEFAULT NULL,
  `4th 50m` double DEFAULT NULL,
  `FES 100m` double DEFAULT NULL,
  `Mid 100m` double DEFAULT NULL,
  `BES 100m` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Swimmers`
--

DROP TABLE IF EXISTS `Swimmers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Swimmers` (
  `id` varchar(8) NOT NULL,
  `fullName` varchar(255) GENERATED ALWAYS AS (concat_ws(' ',`firstName`,`middleName`,`lastName`)) VIRTUAL,
  `firstName` varchar(32) NOT NULL,
  `middleName` varchar(32) DEFAULT NULL,
  `lastName` varchar(32) NOT NULL,
  `birthday` date NOT NULL,
  `gender` varchar(16) NOT NULL,
  `nationality` varchar(16) DEFAULT NULL,
  `region` varchar(16) DEFAULT NULL,
  `county` varchar(16) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `lastUpdateTime` timestamp NULL DEFAULT NULL,
  `lastUpdateType` varchar(16) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `System`
--

DROP TABLE IF EXISTS `System`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `System` (
  `name` varchar(32) NOT NULL,
  `value` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tasks`
--

DROP TABLE IF EXISTS `Tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tasks` (
  `taskId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creatorId` varchar(16) DEFAULT NULL,
  `taskType` varchar(16) NOT NULL,
  `taskOptions` varchar(255) DEFAULT NULL,
  `taskDescription` varchar(255) DEFAULT NULL,
  `targetType` enum('user','swimmer','club','meet') DEFAULT NULL,
  `targetId` varchar(16) DEFAULT NULL,
  `taskStatus` enum('pending','progress','complete','cancelled','error') NOT NULL DEFAULT 'pending',
  `taskSchedule` varchar(32) DEFAULT NULL,
  `taskResult` varchar(240) DEFAULT NULL,
  `startTime` timestamp NULL DEFAULT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`taskId`) USING BTREE,
  KEY `idx_creatorId` (`creatorId`),
  KEY `idx_target` (`targetType`,`targetId`),
  CONSTRAINT `Tasks_ibfk_1` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `id` varchar(16) NOT NULL,
  `username` varchar(64) NOT NULL,
  `password_hash` text NOT NULL,
  `firstName` varchar(32) NOT NULL,
  `lastName` varchar(32) NOT NULL,
  `phone` varchar(32) NOT NULL DEFAULT '',
  `location` varchar(128) NOT NULL,
  `locationId` int(10) unsigned DEFAULT NULL,
  `type` varchar(16) NOT NULL,
  `admin` tinyint(4) NOT NULL DEFAULT 0,
  `status` enum('pending','active','inactive','disabled') DEFAULT 'active',
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `type` (`type`),
  CONSTRAINT `User_ibfk_1` FOREIGN KEY (`type`) REFERENCES `UserTypes` (`type`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserClubs`
--

DROP TABLE IF EXISTS `UserClubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserClubs` (
  `userId` varchar(16) NOT NULL,
  `clubId` varchar(8) NOT NULL,
  `clubOwner` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`userId`,`clubId`) USING BTREE,
  KEY `clubId` (`clubId`) USING BTREE,
  CONSTRAINT `UserClubs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserClubs_ibfk_2` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserMeets`
--

DROP TABLE IF EXISTS `UserMeets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserMeets` (
  `userId` varchar(16) NOT NULL,
  `meetId` varchar(8) NOT NULL,
  `swimmerId` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`userId`,`meetId`),
  KEY `idx_meetId` (`meetId`) USING BTREE,
  CONSTRAINT `UserMeets_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserMeets_ibfk_2` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserSwimmers`
--

DROP TABLE IF EXISTS `UserSwimmers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserSwimmers` (
  `userId` varchar(16) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`userId`,`swimmerId`),
  KEY `swimmerId` (`swimmerId`),
  CONSTRAINT `UserSwimmers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserSwimmers_ibfk_2` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserTypes`
--

DROP TABLE IF EXISTS `UserTypes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserTypes` (
  `type` varchar(8) NOT NULL,
  `seq` int(11) NOT NULL,
  PRIMARY KEY (`type`),
  UNIQUE KEY `seq` (`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'swimming'
--

--
-- Current Database: `swimming`
--

USE `swimming`;

--
-- Final view structure for view `MeetsView`
--

/*!50001 DROP VIEW IF EXISTS `MeetsView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `MeetsView` AS select `Meets`.`id` AS `id`,`Meets`.`code` AS `code`,`Meets`.`date` AS `date`,`Meets`.`duration` AS `duration`,`Meets`.`name` AS `name`,`Meets`.`country` AS `country`,`Meets`.`region` AS `region`,`Meets`.`location` AS `location`,`Locations`.`latitude` AS `latitude`,`Locations`.`longitude` AS `longitude`,`Meets`.`course` AS `course`,`Meets`.`level` AS `level`,`Meets`.`type` AS `type`,`Meets`.`contact` AS `contact`,`Meets`.`email` AS `email` from (`Meets` left join `Locations` on(`Meets`.`locationId` = `Locations`.`locationId`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed

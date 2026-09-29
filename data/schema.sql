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
-- Table structure for table `ClubMeetReleases`
--

DROP TABLE IF EXISTS `ClubMeetReleases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClubMeetReleases` (
  `clubId` varchar(8) NOT NULL,
  `meetId` varchar(8) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`clubId`,`meetId`),
  KEY `meetId` (`meetId`),
  CONSTRAINT `ClubMeetReleases_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ClubMeetReleases_ibfk_2` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  UNIQUE KEY `idx_meetId` (`meetId`) USING BTREE,
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
-- Table structure for table `MeetSwimmerEvents`
--

DROP TABLE IF EXISTS `MeetSwimmerEvents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `MeetSwimmerEvents` (
  `meetId` varchar(8) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`meetId`,`swimmerId`,`stroke`,`distance`) USING BTREE,
  KEY `swimmerId` (`swimmerId`),
  CONSTRAINT `MeetSwimmerEvents_ibfk_1` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MeetSwimmerEvents_ibfk_2` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MeetSwimmerEvents_ibfk_3` FOREIGN KEY (`meetId`, `swimmerId`) REFERENCES `MeetSwimmers` (`meetId`, `swimmerId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MeetSwimmers`
--

DROP TABLE IF EXISTS `MeetSwimmers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `MeetSwimmers` (
  `meetId` varchar(8) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `events` varchar(255) NOT NULL DEFAULT '',
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`meetId`,`swimmerId`) USING BTREE,
  KEY `swimmerId` (`swimmerId`),
  CONSTRAINT `MeetSwimmers_ibfk_1` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MeetSwimmers_ibfk_2` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  `course` varchar(8) DEFAULT NULL,
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`events`)),
  `clubId` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`meetId`),
  KEY `fk_MeetPools_Pools_2` (`poolId`),
  CONSTRAINT `fk_MeetPools_Meets_1` FOREIGN KEY (`meetId`) REFERENCES `Meets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_MeetPools_Pools_2` FOREIGN KEY (`poolId`) REFERENCES `Pools` (`poolId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `NotificationViews`
--

DROP TABLE IF EXISTS `NotificationViews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `NotificationViews` (
  `notificationId` int(10) unsigned NOT NULL,
  `notificationUserId` varchar(16) NOT NULL,
  `notificationViewed` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `notificationDeleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`notificationId`,`notificationUserId`) USING BTREE,
  KEY `NotificationViews_ibfk_1` (`notificationUserId`),
  CONSTRAINT `NotificationViews_ibfk_1` FOREIGN KEY (`notificationUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `NotificationViews_ibfk_2` FOREIGN KEY (`notificationId`) REFERENCES `Notifications` (`notificationId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Notifications`
--

DROP TABLE IF EXISTS `Notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notifications` (
  `notificationId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `notificationCreatorId` varchar(16) NOT NULL,
  `notificationTargetId` varchar(16) DEFAULT NULL,
  `notificationType` enum('info','success','warning','error') NOT NULL,
  `notificationText` varchar(255) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`notificationId`) USING BTREE,
  KEY `idx_userId` (`notificationCreatorId`) USING BTREE,
  CONSTRAINT `Notifications_ibfk_1` FOREIGN KEY (`notificationCreatorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `QualifyingImportPeriodChanges`
--

DROP TABLE IF EXISTS `QualifyingImportPeriodChanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingImportPeriodChanges` (
  `importId` bigint(20) unsigned NOT NULL,
  `operation` enum('insert','update') NOT NULL,
  `year` int(11) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `previousQualifyingStart` date DEFAULT NULL,
  `previousQualifyingEnd` date DEFAULT NULL,
  `previousLastRaceDate` date DEFAULT NULL,
  `importedQualifyingStart` date DEFAULT NULL,
  `importedQualifyingEnd` date DEFAULT NULL,
  `importedLastRaceDate` date DEFAULT NULL,
  PRIMARY KEY (`importId`),
  CONSTRAINT `fk_QualifyingImportPeriodChanges_importId` FOREIGN KEY (`importId`) REFERENCES `QualifyingImports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `QualifyingImportTimeChanges`
--

DROP TABLE IF EXISTS `QualifyingImportTimeChanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingImportTimeChanges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `importId` bigint(20) unsigned NOT NULL,
  `operation` enum('insert','update') NOT NULL,
  `year` int(11) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `gender` varchar(16) NOT NULL,
  `age` varchar(8) NOT NULL,
  `previousTimeString` varchar(16) DEFAULT NULL,
  `previousTime` decimal(8,2) DEFAULT NULL,
  `importedTimeString` varchar(16) NOT NULL,
  `importedTime` decimal(8,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_QualifyingImportTimeChanges_importId` (`importId`),
  CONSTRAINT `fk_QualifyingImportTimeChanges_importId` FOREIGN KEY (`importId`) REFERENCES `QualifyingImports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `QualifyingImports`
--

DROP TABLE IF EXISTS `QualifyingImports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingImports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `layoutId` varchar(32) DEFAULT NULL,
  `layoutName` varchar(128) DEFAULT NULL,
  `year` int(11) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `course` varchar(8) NOT NULL,
  `qualifyingStart` date DEFAULT NULL,
  `qualifyingEnd` date DEFAULT NULL,
  `lastRaceDate` date DEFAULT NULL,
  `importedBy` varchar(16) DEFAULT NULL,
  `importedByName` varchar(96) NOT NULL,
  `status` enum('pending','completed','failed','rolled_back') NOT NULL DEFAULT 'pending',
  `totalCount` int(10) unsigned NOT NULL DEFAULT 0,
  `insertedCount` int(10) unsigned NOT NULL DEFAULT 0,
  `updatedCount` int(10) unsigned NOT NULL DEFAULT 0,
  `errorMessage` text DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `completedAt` datetime DEFAULT NULL,
  `rolledBackAt` datetime DEFAULT NULL,
  `rolledBackBy` varchar(16) DEFAULT NULL,
  `rolledBackByName` varchar(96) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_QualifyingImports_created` (`created`),
  KEY `idx_QualifyingImports_year_area` (`year`,`scope`,`area`),
  KEY `idx_QualifyingImports_importedBy` (`importedBy`),
  KEY `fk_QualifyingImports_rolledBackBy` (`rolledBackBy`),
  CONSTRAINT `fk_QualifyingImports_importedBy` FOREIGN KEY (`importedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_QualifyingImports_rolledBackBy` FOREIGN KEY (`rolledBackBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `lastRaceDate` date DEFAULT NULL COMMENT 'Last date a race can be held to count for eligibility',
  `notes` varchar(255) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`year`,`scope`,`area`,`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `QualifyingPeriodsStaging`
--

DROP TABLE IF EXISTS `QualifyingPeriodsStaging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingPeriodsStaging` (
  `source` varchar(32) NOT NULL COMMENT 'swimming-times | swimturn',
  `year` int(11) NOT NULL COMMENT 'requested season year (--year)',
  `scope` enum('regional','county') NOT NULL,
  `area` varchar(32) NOT NULL,
  `type` enum('general','summer','winter') NOT NULL DEFAULT 'general',
  `qualifyingStart` date DEFAULT NULL,
  `qualifyingEnd` date DEFAULT NULL,
  `lastRaceDate` date DEFAULT NULL COMMENT 'Last date a race can be held to count for eligibility — only set when the source explicitly lists championship dates',
  `notes` varchar(255) DEFAULT NULL,
  `sourceUrl` varchar(512) DEFAULT NULL,
  `fetchedAt` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'explicitly set every run, not ON UPDATE, so unchanged rows still record last checked time',
  PRIMARY KEY (`source`,`year`,`scope`,`area`,`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `QualifyingReports`
--

DROP TABLE IF EXISTS `QualifyingReports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingReports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` int(11) NOT NULL,
  `sources` varchar(64) NOT NULL COMMENT 'comma-separated list of sources included, e.g. swimming-times,swimturn',
  `html` longtext NOT NULL,
  `generatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_generatedAt` (`generatedAt`)
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
-- Table structure for table `QualifyingTimesStaging`
--

DROP TABLE IF EXISTS `QualifyingTimesStaging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `QualifyingTimesStaging` (
  `source` varchar(32) NOT NULL COMMENT 'swimming-times | swimturn',
  `year` int(11) NOT NULL COMMENT 'requested season year (--year)',
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
  `sourceYear` int(11) DEFAULT NULL COMMENT 'season year actually found on the source (e.g. swimturn version prefix), when it differs from `year`',
  `sourceUrl` varchar(512) DEFAULT NULL,
  `fetchedAt` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'explicitly set every run, not ON UPDATE, so unchanged rows still record last checked time',
  PRIMARY KEY (`source`,`year`,`course`,`stroke`,`distance`,`scope`,`area`,`type`,`gender`,`age`) USING BTREE
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
-- Table structure for table `SchemaMigrations`
--

DROP TABLE IF EXISTS `SchemaMigrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SchemaMigrations` (
  `name` varchar(255) NOT NULL,
  `runAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`name`)
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
  CONSTRAINT `fk_Session_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
-- Table structure for table `ShareLinks`
--

DROP TABLE IF EXISTS `ShareLinks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ShareLinks` (
  `token` varchar(64) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `createdBy` varchar(16) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiresAt` datetime NOT NULL,
  `revokedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`token`),
  KEY `idx_ShareLinks_swimmerId` (`swimmerId`),
  KEY `idx_ShareLinks_createdBy` (`createdBy`),
  CONSTRAINT `fk_ShareLinks_Swimmers` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ShareLinks_User` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-100m-female-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-100m-male-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-200m-female-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-200m-male-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-50m-female-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-backstroke-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-backstroke-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-backstroke-50m-male-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-100m-female-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-100m-male-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-200m-female-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-200m-male-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-50m-female-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-breaststroke-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-breaststroke-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-breaststroke-50m-male-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-100m-female-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-100m-male-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-200m-female-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-200m-male-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-50m-female-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-butterfly-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-butterfly-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-butterfly-50m-male-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-100m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-100m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-100m-female-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-100m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-100m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-100m-male-lc` (
  `100m Time` double DEFAULT NULL,
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
  `95-100m` double DEFAULT NULL,
  `Turn` double DEFAULT NULL,
  `1st 50m` double DEFAULT NULL,
  `2nd 50m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-200m-female-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-200m-male-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-50m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-50m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-50m-female-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-freestyle-50m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-freestyle-50m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-freestyle-50m-male-lc` (
  `50m Time` double DEFAULT NULL,
  `0-15m` double DEFAULT NULL,
  `0-20m` double DEFAULT NULL,
  `0-25m` double DEFAULT NULL,
  `0-30m` double DEFAULT NULL,
  `0-35m` double DEFAULT NULL,
  `0-40m` double DEFAULT NULL,
  `0-45m` double DEFAULT NULL,
  `45-50m` double DEFAULT NULL,
  `1st 25m` double DEFAULT NULL,
  `2nd 25m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-individual_medley-200m-female-lc`
--

DROP TABLE IF EXISTS `SpeedChart-individual_medley-200m-female-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-individual_medley-200m-female-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChart-individual_medley-200m-male-lc`
--

DROP TABLE IF EXISTS `SpeedChart-individual_medley-200m-male-lc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChart-individual_medley-200m-male-lc` (
  `200m Time` double DEFAULT NULL,
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
  `BES 100m` double DEFAULT NULL,
  `generated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedChartTimes`
--

DROP TABLE IF EXISTS `SpeedChartTimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedChartTimes` (
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `gender` varchar(16) NOT NULL,
  `duration` decimal(8,2) NOT NULL DEFAULT 0.00,
  `stage` varchar(16) NOT NULL,
  `time` decimal(8,2) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`course`,`stroke`,`distance`,`scope`,`gender`,`duration`,`stage`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedCharts`
--

DROP TABLE IF EXISTS `SpeedCharts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedCharts` (
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `gender` varchar(16) NOT NULL,
  `duration` decimal(8,2) NOT NULL DEFAULT 0.00,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`course`,`stroke`,`distance`,`scope`,`gender`,`duration`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SpeedCharts50m`
--

DROP TABLE IF EXISTS `SpeedCharts50m`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SpeedCharts50m` (
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `gender` varchar(16) NOT NULL,
  `duration` decimal(8,2) NOT NULL DEFAULT 0.00,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`course`,`stroke`,`distance`,`scope`,`gender`,`duration`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SubscriptionTiers`
--

DROP TABLE IF EXISTS `SubscriptionTiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SubscriptionTiers` (
  `id` varchar(32) NOT NULL,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `amount` int(11) NOT NULL DEFAULT 0,
  `currency` char(3) NOT NULL DEFAULT 'GBP',
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
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
-- Table structure for table `SwimmingClubs`
--

DROP TABLE IF EXISTS `SwimmingClubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwimmingClubs` (
  `id` int(10) unsigned NOT NULL COMMENT 'swimming.org clubfinder ID',
  `name` varchar(128) NOT NULL,
  `street` varchar(128) DEFAULT NULL,
  `town` varchar(64) DEFAULT NULL,
  `county` varchar(64) DEFAULT NULL,
  `country` varchar(32) DEFAULT NULL,
  `postcode` varchar(10) DEFAULT NULL,
  `lat` decimal(9,6) DEFAULT NULL,
  `lon` decimal(9,6) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `primaryPoolId` int(10) unsigned DEFAULT NULL COMMENT 'swimming.org poolfinder ID of the club primary pool',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SwimmingPools`
--

DROP TABLE IF EXISTS `SwimmingPools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwimmingPools` (
  `id` int(10) unsigned NOT NULL COMMENT 'swimming.org poolfinder ID',
  `name` varchar(128) NOT NULL,
  `street` varchar(128) DEFAULT NULL,
  `town` varchar(64) DEFAULT NULL,
  `country` varchar(32) DEFAULT NULL,
  `postcode` varchar(10) DEFAULT NULL,
  `lat` decimal(9,6) DEFAULT NULL,
  `lon` decimal(9,6) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
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
  `runAfter` timestamp NULL DEFAULT NULL,
  `retryCount` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `taskResult` text DEFAULT NULL,
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
  `password_hash` text DEFAULT NULL,
  `firstName` varchar(32) NOT NULL,
  `lastName` varchar(32) NOT NULL,
  `phone` varchar(32) NOT NULL DEFAULT '',
  `location` varchar(128) NOT NULL,
  `locationId` int(10) unsigned DEFAULT NULL,
  `role` enum('system','admin','user') NOT NULL DEFAULT 'user',
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `status` enum('pending','active','inactive','disabled') DEFAULT 'active',
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
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
-- Table structure for table `UserSubscription`
--

DROP TABLE IF EXISTS `UserSubscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserSubscription` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL,
  `gcCustomerId` varchar(64) DEFAULT NULL,
  `gcBillingRequestId` varchar(64) DEFAULT NULL,
  `gcMandateId` varchar(64) DEFAULT NULL,
  `gcSubscriptionId` varchar(64) DEFAULT NULL,
  `tier` varchar(32) NOT NULL DEFAULT 'free',
  `status` enum('pending','active','cancelled','failed') DEFAULT 'pending',
  `currentPeriodEnd` datetime DEFAULT NULL,
  `source` enum('gocardless','manual') NOT NULL DEFAULT 'gocardless',
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  KEY `fk_usersub_tier` (`tier`),
  CONSTRAINT `fk_usersub_tier` FOREIGN KEY (`tier`) REFERENCES `SubscriptionTiers` (`id`),
  CONSTRAINT `fk_usersub_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
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
  `xsquad` varchar(32) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`userId`,`swimmerId`),
  KEY `swimmerId` (`swimmerId`),
  CONSTRAINT `UserSwimmers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserSwimmers_ibfk_2` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerMarkers`
--

DROP TABLE IF EXISTS `VideoTimerMarkers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerMarkers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `seq` int(10) unsigned NOT NULL,
  `type` enum('surfacing','split') NOT NULL,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `lengthIndex` smallint(5) unsigned DEFAULT NULL,
  `turnIndex` smallint(5) unsigned DEFAULT NULL,
  `tMs` int(10) unsigned NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_seq` (`sessionId`,`seq`),
  KEY `idx_session_time` (`sessionId`,`tMs`),
  KEY `idx_session_type` (`sessionId`,`type`),
  KEY `idx_session_code` (`sessionId`,`code`),
  KEY `idx_session_length` (`sessionId`,`lengthIndex`),
  KEY `idx_session_turn` (`sessionId`,`turnIndex`),
  CONSTRAINT `fk_VideoTimerMarkers_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessionAnalysis`
--

DROP TABLE IF EXISTS `VideoTimerSessionAnalysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessionAnalysis` (
  `sessionId` varchar(36) NOT NULL,
  `breakoutStartM` decimal(5,2) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`sessionId`),
  CONSTRAINT `fk_VideoTimerSessionAnalysis_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessionBreathCounts`
--

DROP TABLE IF EXISTS `VideoTimerSessionBreathCounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessionBreathCounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `lengthIndex` smallint(5) unsigned NOT NULL,
  `fromM` decimal(6,2) NOT NULL,
  `toM` decimal(6,2) NOT NULL,
  `count` smallint(5) unsigned DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_length` (`sessionId`,`lengthIndex`),
  KEY `idx_session_from_to` (`sessionId`,`fromM`,`toM`),
  CONSTRAINT `fk_VideoTimerSessionBreathCounts_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessionBreathMarkers`
--

DROP TABLE IF EXISTS `VideoTimerSessionBreathMarkers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessionBreathMarkers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `seq` int(10) unsigned NOT NULL,
  `lengthIndex` smallint(5) unsigned NOT NULL,
  `fromM` decimal(6,2) NOT NULL,
  `toM` decimal(6,2) NOT NULL,
  `tMs` int(10) unsigned NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_seq` (`sessionId`,`seq`),
  KEY `idx_session_time` (`sessionId`,`tMs`),
  KEY `idx_session_length` (`sessionId`,`lengthIndex`),
  CONSTRAINT `fk_VideoTimerSessionBreathMarkers_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessionStrokeCounts`
--

DROP TABLE IF EXISTS `VideoTimerSessionStrokeCounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessionStrokeCounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `lengthIndex` smallint(5) unsigned NOT NULL,
  `fromM` decimal(6,2) NOT NULL,
  `toM` decimal(6,2) NOT NULL,
  `count` smallint(5) unsigned DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_length` (`sessionId`,`lengthIndex`),
  KEY `idx_session_from_to` (`sessionId`,`fromM`,`toM`),
  CONSTRAINT `fk_VideoTimerSessionStrokeCounts_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessionStrokeMarkers`
--

DROP TABLE IF EXISTS `VideoTimerSessionStrokeMarkers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessionStrokeMarkers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `seq` int(10) unsigned NOT NULL,
  `lengthIndex` smallint(5) unsigned NOT NULL,
  `fromM` decimal(6,2) NOT NULL,
  `toM` decimal(6,2) NOT NULL,
  `tMs` int(10) unsigned NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_seq` (`sessionId`,`seq`),
  KEY `idx_session_time` (`sessionId`,`tMs`),
  KEY `idx_session_length` (`sessionId`,`lengthIndex`),
  CONSTRAINT `fk_VideoTimerSessionStrokeMarkers_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessionTurns`
--

DROP TABLE IF EXISTS `VideoTimerSessionTurns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessionTurns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(36) NOT NULL,
  `turnIndex` smallint(5) unsigned NOT NULL,
  `breakoutM` decimal(5,2) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_session_turn` (`sessionId`,`turnIndex`),
  CONSTRAINT `fk_VideoTimerSessionTurns_Session` FOREIGN KEY (`sessionId`) REFERENCES `VideoTimerSessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerSessions`
--

DROP TABLE IF EXISTS `VideoTimerSessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerSessions` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(16) NOT NULL,
  `swimmerId` varchar(8) DEFAULT NULL,
  `videoId` varchar(36) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `poolLengthM` tinyint(3) unsigned NOT NULL,
  `lengthCount` smallint(5) unsigned NOT NULL,
  `turnCount` smallint(5) unsigned NOT NULL,
  `officialFinishMs` int(10) unsigned DEFAULT NULL,
  `startOffsetMs` int(11) DEFAULT NULL,
  `status` enum('draft','completed') NOT NULL DEFAULT 'completed',
  `draftData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`draftData`)),
  `notes` text DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `resultSwimmer` varchar(8) DEFAULT NULL,
  `resultCourse` varchar(8) DEFAULT NULL,
  `resultStroke` varchar(32) DEFAULT NULL,
  `resultDistance` varchar(8) DEFAULT NULL,
  `resultSeq` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_vts_user_result` (`userId`,`resultSwimmer`,`resultCourse`,`resultStroke`,`resultDistance`,`resultSeq`),
  KEY `idx_userId` (`userId`),
  KEY `idx_swimmerId` (`swimmerId`),
  KEY `idx_videoId` (`videoId`),
  KEY `idx_result` (`resultSwimmer`,`resultCourse`,`resultStroke`,`resultDistance`,`resultSeq`),
  CONSTRAINT `fk_VideoTimerSessions_Result` FOREIGN KEY (`resultSwimmer`, `resultCourse`, `resultStroke`, `resultDistance`, `resultSeq`) REFERENCES `Results` (`swimmer`, `course`, `stroke`, `distance`, `seq`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_VideoTimerSessions_Swimmers` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_VideoTimerSessions_User` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_VideoTimerSessions_Video` FOREIGN KEY (`videoId`) REFERENCES `VideoTimerVideos` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerVideoCompressionStatuses`
--

DROP TABLE IF EXISTS `VideoTimerVideoCompressionStatuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerVideoCompressionStatuses` (
  `id` tinyint(3) unsigned NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vtvcs_code` (`code`),
  UNIQUE KEY `uq_vtvcs_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoTimerVideos`
--

DROP TABLE IF EXISTS `VideoTimerVideos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoTimerVideos` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(16) NOT NULL,
  `playbackUrl` varchar(255) NOT NULL,
  `uploadKey` varchar(255) DEFAULT NULL,
  `originalPlaybackUrl` text DEFAULT NULL,
  `originalUploadKey` varchar(255) DEFAULT NULL,
  `originalName` varchar(255) NOT NULL,
  `mimeType` varchar(64) NOT NULL,
  `size` bigint(20) unsigned NOT NULL,
  `originalSize` bigint(20) unsigned DEFAULT NULL,
  `compressedPlaybackUrl` text DEFAULT NULL,
  `compressedUploadKey` varchar(255) DEFAULT NULL,
  `compressedSize` bigint(20) unsigned DEFAULT NULL,
  `compressionStatusId` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `compressionError` text DEFAULT NULL,
  `compressionQueuedAt` datetime DEFAULT NULL,
  `compressionStartedAt` datetime DEFAULT NULL,
  `compressionCompletedAt` datetime DEFAULT NULL,
  `durationMs` int(10) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_vtv_compression_status_id` (`compressionStatusId`),
  CONSTRAINT `fk_VideoTimerVideos_User` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vtv_compression_status_id` FOREIGN KEY (`compressionStatusId`) REFERENCES `VideoTimerVideoCompressionStatuses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_Migrations`
--

DROP TABLE IF EXISTS `_Migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_Migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `appliedAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lcm_50_free_splits`
--

DROP TABLE IF EXISTS `lcm_50_free_splits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lcm_50_free_splits` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `gender` enum('M','F') NOT NULL,
  `event` varchar(64) NOT NULL,
  `target_time` decimal(5,2) NOT NULL,
  `split_15m` decimal(5,2) NOT NULL,
  `split_20m` decimal(5,2) NOT NULL,
  `split_25m` decimal(5,2) NOT NULL,
  `split_30m` decimal(5,2) NOT NULL,
  `split_35m` decimal(5,2) NOT NULL,
  `split_40m` decimal(5,2) NOT NULL,
  `split_45m` decimal(5,2) NOT NULL,
  `split_50m` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reference_profile`
--

DROP TABLE IF EXISTS `reference_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reference_profile` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `gender` enum('M','F','U') NOT NULL DEFAULT 'U',
  `distance_m` smallint(5) unsigned NOT NULL,
  `course` enum('LCM','SCM','SCY') NOT NULL,
  `stroke` enum('Freestyle','Backstroke','Breaststroke','Butterfly','IM') NOT NULL,
  `target_time_s` decimal(6,2) NOT NULL,
  `source` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile` (`gender`,`distance_m`,`course`,`stroke`,`target_time_s`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reference_split`
--

DROP TABLE IF EXISTS `reference_split`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reference_split` (
  `profile_id` bigint(20) unsigned NOT NULL,
  `split_distance_m` smallint(5) unsigned NOT NULL,
  `split_time_s` decimal(6,2) NOT NULL,
  PRIMARY KEY (`profile_id`,`split_distance_m`),
  CONSTRAINT `fk_refsplit_profile` FOREIGN KEY (`profile_id`) REFERENCES `reference_profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'swimming'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `extend_speedchart_data` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`%` PROCEDURE `extend_speedchart_data`()
BEGIN
  DECLARE extendPge INT(5) UNSIGNED;
  
  SET extendPge = 50;

  CALL generate_200m_single_stroke('SpeedChart-freestyle-200m-male-lc',extendPge);
  CALL generate_200m_single_stroke('SpeedChart-freestyle-200m-female-lc',extendPge);

  CALL generate_200m_single_stroke('SpeedChart-backstroke-200m-male-lc',extendPge);
  CALL generate_200m_single_stroke('SpeedChart-backstroke-200m-female-lc',extendPge);

  CALL generate_200m_single_stroke('SpeedChart-breaststroke-200m-male-lc',extendPge);
  CALL generate_200m_single_stroke('SpeedChart-breaststroke-200m-female-lc',extendPge);

  CALL generate_200m_single_stroke('SpeedChart-butterfly-200m-male-lc',extendPge);
  CALL generate_200m_single_stroke('SpeedChart-butterfly-200m-female-lc',extendPge);

  CALL generate_100m_single_stroke('SpeedChart-freestyle-100m-male-lc',extendPge);
  CALL generate_100m_single_stroke('SpeedChart-freestyle-100m-female-lc',extendPge);

  CALL generate_100m_single_stroke('SpeedChart-backstroke-100m-male-lc',extendPge);
  CALL generate_100m_single_stroke('SpeedChart-backstroke-100m-female-lc',extendPge);

  CALL generate_100m_single_stroke('SpeedChart-breaststroke-100m-male-lc',extendPge);
  CALL generate_100m_single_stroke('SpeedChart-breaststroke-100m-female-lc',extendPge);

  CALL generate_100m_single_stroke('SpeedChart-butterfly-100m-male-lc',extendPge);
  CALL generate_100m_single_stroke('SpeedChart-butterfly-100m-female-lc',extendPge);

  CALL generate_50m_single_stroke('SpeedChart-freestyle-50m-male-lc',extendPge);
  CALL generate_50m_single_stroke('SpeedChart-freestyle-50m-female-lc',extendPge);

  CALL generate_50m_single_stroke('SpeedChart-backstroke-50m-male-lc',extendPge);
  CALL generate_50m_single_stroke('SpeedChart-backstroke-50m-female-lc',extendPge);

  CALL generate_50m_single_stroke('SpeedChart-breaststroke-50m-male-lc',extendPge);
  CALL generate_50m_single_stroke('SpeedChart-breaststroke-50m-female-lc',extendPge);

  CALL generate_50m_single_stroke('SpeedChart-butterfly-50m-male-lc',extendPge);
  CALL generate_50m_single_stroke('SpeedChart-butterfly-50m-female-lc',extendPge);

  CALL generate_200m_individual_medley('SpeedChart-individual_medley-200m-male-lc',extendPge);
  CALL generate_200m_individual_medley('SpeedChart-individual_medley-200m-female-lc',extendPge);

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `generate_100m_single_stroke` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`%` PROCEDURE `generate_100m_single_stroke`(IN p_table varchar(128), IN p_pge int(5) unsigned)
BEGIN
  DECLARE sql_text LONGTEXT;

  /* Delete existing generated rows */
  SET sql_text = CONCAT(
    'DELETE FROM `', p_table, '` WHERE generated = 1'
  );
  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  /* Insert regenerated rows */
  SET sql_text = CONCAT(
'INSERT INTO `', p_table, '` (
  `100m Time`,
  `0-15m`, `0-20m`, `0-25m`, `0-30m`, `0-35m`,
  `0-40m`, `0-45m`, `0-50m`, `0-60m`, `0-65m`,
  `0-70m`, `0-75m`, `0-80m`, `0-85m`, `0-90m`,
  `0-95m`, `95-100m`,
  `Turn`, `1st 50m`, `2nd 50m`,
  `generated`
)
WITH RECURSIVE
base AS (
  SELECT *
  FROM `', p_table, '`
  WHERE generated = 0
  ORDER BY `100m Time` DESC
  LIMIT 1
),
steps AS (
  SELECT ROUND(`100m Time` + 0.5, 2) AS new_time FROM base
  UNION ALL
  SELECT ROUND(new_time + 0.5, 2)
  FROM steps, base
  WHERE new_time + 0.5 <= ROUND(base.`100m Time` * ', (100+p_pge ) / 100.0, ', 2)
)
SELECT
  s.new_time,

  ROUND(b.`0-15m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-20m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-25m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-30m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-35m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-40m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-45m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-50m` * (s.new_time / b.`100m Time`), 2),

  ROUND(b.`0-60m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-65m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-70m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-75m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-80m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-85m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-90m` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`0-95m` * (s.new_time / b.`100m Time`), 2),

  ROUND(
    s.new_time
    - ROUND(b.`0-95m` * (s.new_time / b.`100m Time`), 2),
    2
  ),

  ROUND(b.`Turn` * (s.new_time / b.`100m Time`), 2),
  ROUND(b.`1st 50m` * (s.new_time / b.`100m Time`), 2),
  ROUND(
    s.new_time
    - ROUND(b.`1st 50m` * (s.new_time / b.`100m Time`), 2),
    2
  ),

  1
FROM steps s
CROSS JOIN base b;'
  );

  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `generate_200m_individual_medley` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`%` PROCEDURE `generate_200m_individual_medley`(IN p_table varchar(128), IN p_pge int(5) unsigned)
BEGIN
  DECLARE sql_text LONGTEXT;

  /* Delete existing generated rows */
  SET sql_text = CONCAT(
    'DELETE FROM `', p_table, '` WHERE generated = 1'
  );
  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  /* Insert regenerated rows */
  SET sql_text = CONCAT(
'INSERT INTO `', p_table, '` (
  `200m Time`,
  `0-15m`, `0-25m`, `0-50m`, `0-75m`, `0-100m`,
  `0-125m`, `0-150m`, `0-175m`, `175-200m`,
  `1st 50m`, `2nd 50m`, `3rd 50m`, `4th 50m`,
  `FES 100m`, `Mid 100m`, `BES 100m`,
  `generated`
)
WITH RECURSIVE
base AS (
  SELECT
    `200m Time` AS base_time,
    (`0-15m`  / `200m Time`) AS f15,
    (`0-25m`  / `200m Time`) AS f25,
    (`0-50m`  / `200m Time`) AS f50,
    (`0-75m`  / `200m Time`) AS f75,
    (`0-100m` / `200m Time`) AS f100,
    (`0-125m` / `200m Time`) AS f125,
    (`0-150m` / `200m Time`) AS f150,
    (`0-175m` / `200m Time`) AS f175
  FROM `', p_table, '`
  WHERE generated = 0
  ORDER BY `200m Time` DESC
  LIMIT 1
),
steps AS (
  SELECT ROUND(base_time + 0.5, 2) AS new_time FROM base
  UNION ALL
  SELECT ROUND(new_time + 0.5, 2)
  FROM steps, base
  WHERE new_time + 0.5 <= ROUND(base_time * ', (100+p_pge ) / 100.0, ', 2)
)
SELECT
  s.new_time,

  ROUND(b.f15  * s.new_time, 2),
  ROUND(b.f25  * s.new_time, 2),
  ROUND(b.f50  * s.new_time, 2),
  ROUND(b.f75  * s.new_time, 2),
  ROUND(b.f100 * s.new_time, 2),
  ROUND(b.f125 * s.new_time, 2),
  ROUND(b.f150 * s.new_time, 2),
  ROUND(b.f175 * s.new_time, 2),

  ROUND(s.new_time - (b.f175 * s.new_time), 2),

  ROUND(b.f50 * s.new_time, 2),                               -- 1st 50 (Fly)
  ROUND((b.f100 - b.f50) * s.new_time, 2),                    -- 2nd 50 (Back)
  ROUND((b.f150 - b.f100) * s.new_time, 2),                   -- 3rd 50 (Breast)
  ROUND((1 - b.f150) * s.new_time, 2),                        -- 4th 50 (Free)

  ROUND(b.f100 * s.new_time, 2),                              -- FES 100
  ROUND((b.f150 - b.f50) * s.new_time, 2),                    -- Mid 100
  ROUND((1 - b.f100) * s.new_time, 2),                        -- BES 100

  1
FROM steps s
CROSS JOIN base b;'
  );

  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `generate_200m_single_stroke` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`%` PROCEDURE `generate_200m_single_stroke`(IN p_table varchar(128), IN p_pge int(5) unsigned)
BEGIN
  DECLARE sql_text LONGTEXT;

  /* 1. Delete existing generated rows */
  SET sql_text = CONCAT(
    'DELETE FROM `', p_table, '` WHERE generated = 1'
  );
  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  /* 2. Insert regenerated rows */
  SET sql_text = CONCAT(
'INSERT INTO `', p_table, '` (
  `200m Time`,
  `0-15m`, `0-25m`, `0-50m`, `0-75m`, `0-100m`,
  `0-125m`, `0-150m`, `0-175m`, `175-200m`,
  `1st 50m`, `2nd 50m`, `3rd 50m`, `4th 50m`,
  `FES 100m`, `Mid 100m`, `BES 100m`,
  `generated`
)
WITH RECURSIVE
base AS (
  SELECT
    `200m Time` AS base_time,
    (`0-15m`  / `200m Time`) AS f15,
    (`0-25m`  / `200m Time`) AS f25,
    (`0-50m`  / `200m Time`) AS f50,
    (`0-75m`  / `200m Time`) AS f75,
    (`0-100m` / `200m Time`) AS f100,
    (`0-125m` / `200m Time`) AS f125,
    (`0-150m` / `200m Time`) AS f150,
    (`0-175m` / `200m Time`) AS f175
  FROM `', p_table, '`
  WHERE generated = 0
  ORDER BY `200m Time` DESC
  LIMIT 1
),
steps AS (
  SELECT ROUND(base_time + 0.5, 2) AS new_time FROM base
  UNION ALL
  SELECT ROUND(new_time + 0.5, 2)
  FROM steps, base
  WHERE new_time + 0.5 <= ROUND(base_time * ', (100+p_pge ) / 100.0, ', 2)
)
SELECT
  s.new_time,

  ROUND(b.f15  * s.new_time, 2),
  ROUND(b.f25  * s.new_time, 2),
  ROUND(b.f50  * s.new_time, 2),
  ROUND(b.f75  * s.new_time, 2),
  ROUND(b.f100 * s.new_time, 2),
  ROUND(b.f125 * s.new_time, 2),
  ROUND(b.f150 * s.new_time, 2),
  ROUND(b.f175 * s.new_time, 2),

  ROUND(s.new_time - (b.f175 * s.new_time), 2),

  ROUND(b.f50 * s.new_time, 2),
  ROUND((b.f100 - b.f50) * s.new_time, 2),
  ROUND((b.f150 - b.f100) * s.new_time, 2),
  ROUND((1 - b.f150) * s.new_time, 2),

  ROUND(b.f100 * s.new_time, 2),
  ROUND((b.f150 - b.f50) * s.new_time, 2),
  ROUND((1 - b.f100) * s.new_time, 2),

  1
FROM steps s
CROSS JOIN base b;'
  );

  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `generate_50m_single_stroke` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`%` PROCEDURE `generate_50m_single_stroke`(IN p_table varchar(128), IN p_pge int(5) unsigned )
BEGIN
  DECLARE sql_text LONGTEXT;

  /* Delete existing generated rows */
  SET sql_text = CONCAT(
    'DELETE FROM `', p_table, '` WHERE generated = 1'
  );
  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  /* Insert regenerated rows */
  SET sql_text = CONCAT(
'INSERT INTO `', p_table, '` (
  `50m Time`,
  `0-15m`, `0-20m`, `0-25m`, `0-30m`, `0-35m`,
  `0-40m`, `0-45m`, `45-50m`,
  `1st 25m`, `2nd 25m`,
  `generated`
)
WITH RECURSIVE
base AS (
  SELECT *
  FROM `', p_table, '`
  WHERE generated = 0
  ORDER BY `50m Time` DESC
  LIMIT 1
),
steps AS (
  SELECT ROUND(`50m Time` + 0.2, 2) AS new_time FROM base
  UNION ALL
  SELECT ROUND(new_time + 0.2, 2)
  FROM steps, base
  WHERE new_time + 0.2 <= ROUND(base.`50m Time` * ', (100+p_pge ) / 100.0, ', 2)
)
SELECT
  s.new_time,

  ROUND(b.`0-15m` * (s.new_time / b.`50m Time`), 2),
  ROUND(b.`0-20m` * (s.new_time / b.`50m Time`), 2),
  ROUND(b.`0-25m` * (s.new_time / b.`50m Time`), 2),
  ROUND(b.`0-30m` * (s.new_time / b.`50m Time`), 2),
  ROUND(b.`0-35m` * (s.new_time / b.`50m Time`), 2),
  ROUND(b.`0-40m` * (s.new_time / b.`50m Time`), 2),
  ROUND(b.`0-45m` * (s.new_time / b.`50m Time`), 2),

  ROUND(
    s.new_time
    - ROUND(b.`0-45m` * (s.new_time / b.`50m Time`), 2),
    2
  ),

  ROUND(b.`1st 25m` * (s.new_time / b.`50m Time`), 2),
  ROUND(
    s.new_time
    - ROUND(b.`1st 25m` * (s.new_time / b.`50m Time`), 2),
    2
  ),

  1
FROM steps s
CROSS JOIN base b;'
  );

  PREPARE stmt FROM sql_text;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed

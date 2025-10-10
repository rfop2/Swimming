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
-- Table structure for table `ClubSwimmers`
--

DROP TABLE IF EXISTS `ClubSwimmers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClubSwimmers` (
  `clubId` varchar(8) NOT NULL,
  `swimmerId` varchar(8) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
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
  `clubRegion` varchar(8) NOT NULL,
  `clubCounty` varchar(8) NOT NULL,
  `meetName` varchar(128) DEFAULT NULL,
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
-- Table structure for table `Qualifying`
--

DROP TABLE IF EXISTS `Qualifying`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Qualifying` (
  `created` date NOT NULL DEFAULT current_timestamp(),
  `year` int(11) NOT NULL,
  `course` varchar(8) NOT NULL,
  `stroke` varchar(32) NOT NULL,
  `distance` varchar(8) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `area` varchar(16) NOT NULL,
  `gender` varchar(16) NOT NULL,
  `age` varchar(8) NOT NULL,
  `timeString` varchar(16) NOT NULL,
  `time` decimal(8,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`year`,`course`,`stroke`,`distance`,`scope`,`area`,`gender`,`age`),
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
-- Table structure for table `Tasks`
--

DROP TABLE IF EXISTS `Tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tasks` (
  `taskIid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creatorId` varchar(8) DEFAULT NULL,
  `taskType` varchar(16) NOT NULL,
  `taskOptions` varchar(255) DEFAULT NULL,
  `targetType` enum('swimmer','club','meet') DEFAULT NULL,
  `targetId` varchar(8) DEFAULT NULL,
  `taskStatus` enum('pending','progress','cancelled','error') NOT NULL DEFAULT 'pending',
  `taskSchedule` varchar(32) DEFAULT NULL,
  `taskResult` varchar(240) DEFAULT NULL,
  `startTime` timestamp NULL DEFAULT NULL,
  `endTime` timestamp NULL DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`taskIid`) USING BTREE,
  KEY `idx_creatorId` (`creatorId`),
  KEY `idx_target` (`targetType`,`targetId`)
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
  `location` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `admin` tinyint(4) NOT NULL DEFAULT 0,
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
  `squad` varchar(32) NOT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`userId`,`swimmerId`),
  KEY `swimmerId` (`swimmerId`),
  CONSTRAINT `UserSwimmers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserSwimmers_ibfk_2` FOREIGN KEY (`swimmerId`) REFERENCES `Swimmers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `UserSwimmersView`
--

DROP TABLE IF EXISTS `UserSwimmersView`;
/*!50001 DROP VIEW IF EXISTS `UserSwimmersView`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `UserSwimmersView` AS SELECT
 1 AS `id`,
  1 AS `fullName`,
  1 AS `firstName`,
  1 AS `middleName`,
  1 AS `lastName`,
  1 AS `birthday`,
  1 AS `gender`,
  1 AS `nationality`,
  1 AS `region`,
  1 AS `county`,
  1 AS `squad`,
  1 AS `active` */;
SET character_set_client = @saved_cs_client;

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

--
-- Final view structure for view `UserSwimmersView`
--

/*!50001 DROP VIEW IF EXISTS `UserSwimmersView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `UserSwimmersView` AS select `Swimmers`.`id` AS `id`,`Swimmers`.`fullName` AS `fullName`,`Swimmers`.`firstName` AS `firstName`,`Swimmers`.`middleName` AS `middleName`,`Swimmers`.`lastName` AS `lastName`,`Swimmers`.`birthday` AS `birthday`,`Swimmers`.`gender` AS `gender`,`Swimmers`.`nationality` AS `nationality`,`Swimmers`.`region` AS `region`,`Swimmers`.`county` AS `county`,`UserSwimmers`.`squad` AS `squad`,`Swimmers`.`active` AS `active` from (`UserSwimmers` join `Swimmers` on(`UserSwimmers`.`swimmerId` = `Swimmers`.`id`)) */;
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

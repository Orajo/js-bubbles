# --------------------------------------------------------
# Host:                         127.0.0.1
# Server version:               5.1.56-community
# Server OS:                    Win32
# HeidiSQL version:             6.0.0.3603
# Date/time:                    2011-11-07 16:29:17
# --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

# Dumping database structure for jsbubbles
CREATE DATABASE IF NOT EXISTS `jsbubbles` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `jsbubbles`;


# Dumping structure for table jsbubbles.game
DROP TABLE IF EXISTS `game`;
CREATE TABLE IF NOT EXISTS `game` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `type` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COMMENT='Słownik typów gier';

# Dumping data for table jsbubbles.game: ~4 rows (approximately)
/*!40000 ALTER TABLE `game` DISABLE KEYS */;
INSERT INTO `game` (`id`, `name`, `type`) VALUES
	(1, 'Standard', 'type1'),
	(2, 'Compressive', 'type2'),
	(3, 'Add balls', 'type3'),
	(4, 'Add balls and compress', 'type4');
/*!40000 ALTER TABLE `game` ENABLE KEYS */;


# Dumping structure for table jsbubbles.gamer
DROP TABLE IF EXISTS `gamer`;
CREATE TABLE IF NOT EXISTS `gamer` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `options` varchar(1000) NOT NULL COMMENT 'opcje gry danego użytkownika zapisane w postaci zserializowanego JSON',
  `add_date` datetime DEFAULT NULL,
  `last_update_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8 COMMENT='Tablica graczy';

# Dumping data for table jsbubbles.gamer: ~6 rows (approximately)
/*!40000 ALTER TABLE `gamer` DISABLE KEYS */;
/*!40000 ALTER TABLE `gamer` ENABLE KEYS */;


# Dumping structure for table jsbubbles.stats
DROP TABLE IF EXISTS `stats`;
CREATE TABLE IF NOT EXISTS `stats` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `fk_gamer` int(10) unsigned NOT NULL,
  `fk_game` tinyint(3) unsigned NOT NULL,
  `games_no` mediumint(8) unsigned NOT NULL DEFAULT '0',
  `max` int(10) unsigned NOT NULL DEFAULT '0',
  `avg` int(10) unsigned NOT NULL DEFAULT '0',
  `last_update_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_GAME_GAMER` (`fk_game`,`fk_gamer`),
  KEY `FK_stats_gamer` (`fk_gamer`),
  CONSTRAINT `FK_stats_game` FOREIGN KEY (`fk_game`) REFERENCES `game` (`id`),
  CONSTRAINT `FK_stats_gamer` FOREIGN KEY (`fk_gamer`) REFERENCES `gamer` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1411 DEFAULT CHARSET=utf8 COMMENT='Tabela na wyniki poszczególnych gier\r\n';

# Dumping data for table jsbubbles.stats: ~24 rows (approximately)
/*!40000 ALTER TABLE `stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `stats` ENABLE KEYS */;


# Dumping structure for trigger jsbubbles.set_gamer_add_date
DROP TRIGGER IF EXISTS `set_gamer_add_date`;
SET SESSION SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `set_gamer_add_date` BEFORE INSERT ON `gamer` FOR EACH ROW BEGIN
	set NEW.add_date = NOW();
END//
DELIMITER ;
SET SESSION SQL_MODE=@OLD_SQL_MODE;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;

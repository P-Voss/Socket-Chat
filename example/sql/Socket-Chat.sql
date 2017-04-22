/*
Example data for the chat
Contains 2 users and 2 chatrooms
*/

-- ----------------------------
-- Table structure for `chatRooms`
-- ----------------------------
DROP TABLE IF EXISTS `chatRooms`;
CREATE TABLE `chatRooms` (
  `roomId` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `description` varchar(1000) COLLATE utf8_unicode_ci DEFAULT NULL,
  `entryMessage` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL,
  `isPermanent` int(1) NOT NULL DEFAULT '0',
  `isHidden` int(1) NOT NULL DEFAULT '0',
  `creator` int(11) DEFAULT NULL,
  PRIMARY KEY (`roomId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of chatRooms
-- ----------------------------
INSERT INTO `chatRooms` VALUES ('1', 'lobby', 'Entry to the chat', 'Hello', '1', '0', null);
INSERT INTO `chatRooms` VALUES ('2', 'Another room', 'So nice', 'Hey.', '1', '0', null);

-- ----------------------------
-- Table structure for `users`
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `userId` int(8) unsigned NOT NULL AUTO_INCREMENT,
  `chatname` varchar(32) NOT NULL,
  `usergroup` varchar(12) NOT NULL DEFAULT 'User',
  `isActive` int(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('1', 'Admin', 'Admin', '1');
INSERT INTO `users` VALUES ('2', 'Henry', 'User', '1');

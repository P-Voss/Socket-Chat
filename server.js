
var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;
var uuid = require('node-uuid');
var fs = require('fs');
var _ = require('lodash')._;

var init = require('./init');

var messageService = require('./message/message');
var userService = require('./user/user');
messageService.userService = userService;

var userMapper = require('./database/user');
var messageMapper = require('./database/message');

var clients = [];
var connection = init.getDb();
userMapper.db = connection;
messageMapper.db = connection;

messageService.messageMapper = messageMapper;
userService.userMapper = userMapper;

var wss = init.getWss();
wss.on('connection', function (ws) {
    var client_uuid = uuid.v4();
    clients.push({
        "id": client_uuid,
        "userId": null,
        "ws": ws,
        "nickname": "",
        "isAdmin": false,
        "roomId": 1
    });
    userService.clients = clients;
    
    var updateRoomList = function(roomlist) {
        client = userService.getClientByUUID(client_uuid);
        var clientSocket = client.ws;
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
                "message": roomlist,
                "type": "roomlist"
            }));
        }
    };
    var switchRoom = function (message, rooms) {
        var roomId = /^([1-9{1}][\d]*)$/.exec(message);
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].roomId === parseInt(roomId[1]) || rooms[i].roomId === message) {
                var changeRoom = rooms[i];
                for (var i = 0; i < clients.length; i++) {
                    if (clients[i].id === client_uuid) {
                        var oldRoomId = clients[i].roomId;
                        clients[i].roomId = changeRoom.roomId;
                        sendExitMessageRoom(clients[i], oldRoomId);
                        sendJoinMessage(clients[i], changeRoom);
                        updateUserList(changeRoom.roomId);
                        updateUserList(oldRoomId);
                        messageService.sendRoomInfo(clients[i], changeRoom);
                        break;
                    }
                }
                break;
            }
        }
    };
    
    selectRoomlist(updateRoomList);

    ws.on('message', function (message) {
        var commandMessage = false;
        client = userService.getClientByUUID(client_uuid);

        if (message.indexOf('/init') === 0) {
            commandMessage = true;
            initUser(client, message);
            selectRoomlist(function(rooms) {
                messageService.sendRoomInfo(client, getRoomById(1, rooms))
            });
        }

        if (message.indexOf('/nick') === 0) {
            commandMessage = true;
            var oldName = client.nickname;
            userService.changeNickname(client, message);
            if (client.nickname !== oldName) {
                messageService.ackNameChange(client, oldName);
                userService.clients = clients;
                updateUserList(client.roomId);
            }
        }

        if (message.indexOf('/dice') === 0) {
            commandMessage = true;
            rollDice(client, message);
        }

        if (message.indexOf('/coin') === 0) {
            commandMessage = true;
            coinflip(client);
        }

        if (message.indexOf('/msg') === 0) {
            commandMessage = true;
            messageService.whisper(client, message);
        }

        if (message.indexOf('/join') === 0) {
            commandMessage = true;
            var messageArray = message.split(" ");
            if (messageArray.length > 1) {
                selectRoomlist(function(rooms){
                    switchRoom(messageArray[1], rooms);
                });
            }
        }

        if (message.indexOf('@') === 0) {
            commandMessage = true;
            messageService.directMessage(client, message);
        }

        if (message.indexOf('/adminmsg') === 0) {
            commandMessage = true;
            if (client.isAdmin) {
                messageService.broadcastMessage(client.nickname, message.substring(10), 'message');
            }
        }

        if (!commandMessage) {
            messageService.sendMessage(client.nickname, message, 'message', client.roomId);
        }

    });

    ws.on('close', function () {
        var exitClient = null;
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].id === client_uuid) {
                exitClient = clients[i];
                clients.splice(i, 1);
            }
        }
        updateUserList(exitClient.roomId);
        userService.clients = clients;
        if (exitClient !== null) {
            sendExitMessage(exitClient);
        }
    });


});


function forceExit(client) {
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].id === client.id) {
            clients.splice(i, 1);
        }
    }
    var clientSocket = client.ws;
    if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
            "name": "System",
            "message": "Dein Account ist schon im Chat angemeldet.",
            "type": "disconnect"
        }));
    }
}

function initUserData(client) {
    var sql = "SELECT COALESCE(benutzerdaten.chatname, charakter.vorname, benutzerdaten.profilname) AS nickname, benutzerdaten.usergruppe \n\
                FROM benutzerdaten\n\
                LEFT JOIN charakter\n\
                    ON charakter.userId = benutzerdaten.userId AND charakter.active = 1\n\
                WHERE benutzerdaten.userId = ? AND benutzerdaten.active = 1";
    connection.execute(sql, [client.userId], function (err, result, fields) {
        if (!err) {
            if (result[0] == null) {
                client.nickname = "Gast";
                client.isAdmin = false;
            } else {
                client.nickname = result[0].nickname;
                client.isAdmin = result[0].usergruppe === "Admin";
            }
            sendIntroMessage(client);
            updateUserList(1);
        } else {
            console.log("Fehler");
            return false;
        }
    });
}

function selectRoomlist(cbFunction) {
    var sql = "SELECT * FROM chatRooms";
    var rooms = [];
    connection.query(sql, function(err, result, fields) {
        if (!err) {
            for (var i = 0; i < result.length; i++) {
                rooms.push({
                    "roomId": result[i].roomId,
                    "name": result[i].name,
                    "isHidden": result[i].isHidden === 1,
                    "isRPG": result[i].isRPG ===1,
                    "creator": result[i].creator,
                    "description": result[i].description,
                    "entryMessage": result[i].entryMessage
                });
            }
        } else {
            rooms.push({
                "roomId": 1,
                "name": "Lobby",
                "isHidden": false,
                "isRPG": false,
                "creator": 0,
                "description": "OOC-Bereich",
                "entryMessage": ""
            });
        }
        cbFunction(rooms);
    });
}

function getRoomById(roomId, rooms) {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomId === roomId) {
            return rooms[i];
        }
    }
    return false;
}

function sendIntroMessage(client) {
    var message = "User " + client.nickname + " hat den Chat betreten.";
    messageService.sendMessage("System", message, "message", client.roomId);
}

function sendExitMessage(client) {
    var message = "User " + client.nickname + " hat den Chat verlassen.";
    messageService.sendMessage("System", message, "message", client.roomId);
}

function sendExitMessageRoom(client, oldRoomId) {
    var message = "User " + client.nickname + " hat den Raum verlassen.";
    messageService.sendMessage("System", message, "message", oldRoomId);
}

function sendJoinMessage(client, changeRoom) {
    var message = client.nickname + " hat den Raum " + changeRoom.name + " betreten.";
    messageService.sendMessage("System", message, "message", changeRoom.roomId);
}

function updateUserList(roomId) {
    var clientList = [];
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].roomId === roomId) {
            clientList.push({
                "nickname": clients[i].nickname,
                "isAdmin": clients[i].isAdmin
            });
        }
    }
    for (var i = 0; i < clients.length; i++) {
        var clientSocket = clients[i].ws;
        if (clientSocket.readyState === WebSocket.OPEN
                && clients[i].roomId === roomId) {
            clientSocket.send(JSON.stringify({
                "message": clientList,
                "type": "userlist"
            }));
        }
    }
}


// --------------------------------------
// --- functions called by user input ---
// --------------------------------------

function initUser(client, message) {
    var idArray = message.split(" ");
    if (idArray.length >= 2) {
        if (client !== false) {
            if (userService.userAlreadyInChat(idArray[1])) {
                client.userId = idArray[1];
                forceExit(client);
            } else {
                client.userId = idArray[1];
                initUserData(client);
            }
        }
    }
}

/**
 * @param {type} client
 * @param {type} inMessage
 * @returns {undefined}
 */
function rollDice(client, inMessage) {
    var diceSpecs = /(\d*)w(\d*)/.exec(inMessage);
    if (diceSpecs !== null) {
        var maxPoints = diceSpecs[2] < 2 ? 2 : diceSpecs[2];
        if (diceSpecs[1] > 1 && diceSpecs[1] < 10) {
            var sum = 0;
            var message = client.nickname + " packt den Würfelbecher und wirft mit " + diceSpecs[1] + " " + maxPoints + "-seitigen Würfeln: ";
            for (var i = 0; i < diceSpecs[1]; i++) {
                var points = dice(maxPoints);
                sum += points;
                message += points;
                if (i < diceSpecs[1] - 1) {
                    message += ", ";
                } else {
                    message += ".";
                }
            }
            message += " Summe: " + sum;
        } else {
            var message = client.nickname + " packt den Würfelbecher und wirft mit einem " + maxPoints + "-seitigen Würfel: " + dice(maxPoints);
        }
    } else {
        var message = client.nickname + " packt den Würfelbecher und wirft mit einem 6-seitigen Würfel: " + dice(6);
    }
    messageService.sendMessage("System", message, "message", client.roomId);
}

function dice(maxPoints) {
    return Math.floor(Math.random() * maxPoints) + 1;
}

function coinflip(client) {
    var headsTails = dice(2) === 1 ? "Kopf" : "Zahl";
    var message = client.nickname + " wirft eine Münze... sie landet und zeigt: " + headsTails;
    messageService.sendMessage("System", message, "message", client.roomId);
}
